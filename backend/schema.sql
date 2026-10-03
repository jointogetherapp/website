-- Reviewed bootstrap, NOT a recorded migration. Fresh isolated Supabase project only.
-- Never apply to the Buttonwood project. No auth configuration or public objects changed.
begin;
create schema together;
create schema together_private;
revoke all on schema together, together_private from public;
grant usage on schema together to anon, authenticated;
grant usage on schema together_private to authenticated;
alter default privileges in schema together revoke execute on functions from public;
alter default privileges in schema together_private revoke execute on functions from public;

create table together.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 pseudonym text not null check (length(trim(pseudonym)) between 2 and 40),
 created_at timestamptz not null default now()
);
create table together.books (
 id uuid primary key default gen_random_uuid(), title text not null, author text not null,
 chapters integer not null check (chapters between 1 and 1000), description text not null default '',
 published boolean not null default false
);
create table together.circles (
 id uuid primary key default gen_random_uuid(), book_id uuid not null references together.books,
 owner_id uuid references together.profiles on delete restrict, name text not null check(length(name) between 2 and 80),
 mode text not null check(mode in ('virtual','in-person')),
 city text check(length(city)<=80), public_venue text check(length(public_venue)<=160),
 capacity integer not null default 8 check(capacity between 2 and 12),
 status text not null default 'draft' check(status in ('draft','open','active','completed','cancelled')),
 starts_at timestamptz, created_at timestamptz not null default now(),
 check(mode <> 'in-person' or city is not null)
);
create table together.memberships (
 circle_id uuid references together.circles on delete cascade,
 user_id uuid references together.profiles on delete cascade,
 joined_at timestamptz not null default now(), primary key(circle_id,user_id)
);
create index memberships_user on together.memberships(user_id,circle_id);
create table together_private.entitlements (
 user_id uuid primary key references together.profiles on delete cascade,
 plus_until timestamptz not null, source text not null check(source in ('admin','verified-payment'))
);
create table together.posts (
 id uuid primary key default gen_random_uuid(), circle_id uuid not null references together.circles on delete cascade,
 author_id uuid not null references together.profiles on delete cascade,
 chapter integer not null check(chapter > 0), body text not null check(length(trim(body)) between 1 and 4000),
 created_at timestamptz not null default now()
);
create index posts_circle_chapter on together.posts(circle_id,chapter,created_at);
create table together.progress (
 user_id uuid references together.profiles on delete cascade, circle_id uuid references together.circles on delete cascade,
 chapter integer not null check(chapter>=0), updated_at timestamptz not null default now(), primary key(user_id,circle_id)
);
create table together.blocks (
 blocker_id uuid references together.profiles on delete cascade, blocked_id uuid references together.profiles on delete cascade,
 primary key(blocker_id,blocked_id), check(blocker_id<>blocked_id)
);
create table together_private.reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references together.profiles on delete cascade,
 post_id uuid references together.posts on delete set null, reason text not null check(length(trim(reason)) between 5 and 1000),
 status text not null default 'pending' check(status in ('pending','reviewed','resolved')), created_at timestamptz not null default now()
);
create table together.badges (
 user_id uuid references together.profiles on delete cascade, code text not null check(code in ('first-chapter','book-finished')),
 awarded_at timestamptz not null default now(), primary key(user_id,code)
);
create table together.next_book_votes (
 user_id uuid references together.profiles on delete cascade, circle_id uuid references together.circles on delete cascade,
 book_id uuid not null references together.books, primary key(user_id,circle_id)
);
-- Private, uid-bound lookup functions avoid membership RLS self-recursion.
create function together_private.is_member(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from together.memberships where circle_id=cid and user_id=auth.uid());
$$;
create function together_private.is_blocked(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from together.blocks where (blocker_id=auth.uid() and blocked_id=uid) or (blocker_id=uid and blocked_id=auth.uid()));
$$;
create function together_private.shares_circle(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from together.memberships a join together.memberships b using(circle_id) where a.user_id=auth.uid() and b.user_id=uid);
$$;
-- All exposed and private tables are protected. Only read grants unless explicitly added below.
alter table together.profiles enable row level security;
alter table together.books enable row level security;
alter table together.circles enable row level security;
alter table together.memberships enable row level security;
alter table together.posts enable row level security;
alter table together.progress enable row level security;
alter table together.blocks enable row level security;
alter table together.badges enable row level security;
alter table together.next_book_votes enable row level security;
alter table together_private.entitlements enable row level security;
alter table together_private.reports enable row level security;
revoke all on all tables in schema together, together_private from anon, authenticated;
grant select on together.books,together.circles to anon,authenticated;
grant select on together.profiles,together.memberships,together.posts,together.progress,together.blocks,together.badges,together.next_book_votes to authenticated;
create policy published_books on together.books for select to anon,authenticated using(published);
create policy discover_circles on together.circles for select to anon,authenticated using(status in ('open','active','completed'));
create policy own_drafts on together.circles for select to authenticated using(owner_id=(select auth.uid()));
create policy circle_profiles on together.profiles for select to authenticated using(id=(select auth.uid()) or (together_private.shares_circle(id) and not together_private.is_blocked(id)));
create policy circle_memberships on together.memberships for select to authenticated using(together_private.is_member(circle_id) and not together_private.is_blocked(user_id));
create policy circle_posts on together.posts for select to authenticated using(together_private.is_member(circle_id) and not together_private.is_blocked(author_id));
create policy own_progress on together.progress for select to authenticated using(user_id=(select auth.uid()));
create policy own_blocks on together.blocks for select to authenticated using(blocker_id=(select auth.uid()));
create policy own_badges on together.badges for select to authenticated using(user_id=(select auth.uid()));
create policy own_votes on together.next_book_votes for select to authenticated using(user_id=(select auth.uid()));

-- One uid-bound transactional command gate. No user IDs, entitlement values or role claims accepted.
-- Writes deliberately bypass RLS only after explicit authorization, row locks and validation.
create function together_private.command(action text, payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid := auth.uid(); cid uuid; pid uuid; bid uuid; c together.circles%rowtype;
 n integer; ch integer; premium boolean; result jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in required' using errcode='42501'; end if;
 if action='save_profile' then
  insert into together.profiles(id,pseudonym) values(uid,payload->>'pseudonym')
  on conflict(id) do update set pseudonym=excluded.pseudonym;
  return jsonb_build_object('id',uid);
 end if;
 -- Serializes each user's join/create/leave, enforcing cross-circle plan limits under races.
 perform 1 from together.profiles where id=uid for update;
 if not found then raise exception 'Create your profile first'; end if;
 select exists(select 1 from together_private.entitlements where user_id=uid and plus_until>now()) into premium;
 if action='entitlement' then return jsonb_build_object('plus',premium); end if;
 if action='block' then
  pid := (payload->>'user_id')::uuid;
  if not together_private.shares_circle(pid) then raise exception 'Member unavailable' using errcode='42501'; end if;
  insert into together.blocks values(uid,pid) on conflict do nothing;
  return '{"ok":true}'::jsonb;
 end if;
 if action='report' then
  pid := (payload->>'post_id')::uuid;
  select circle_id into cid from together.posts where id=pid;
  if not together_private.is_member(cid) then raise exception 'Post unavailable' using errcode='42501'; end if;
  insert into together_private.reports(reporter_id,post_id,reason) values(uid,pid,payload->>'reason');
  return '{"ok":true}'::jsonb;
 end if;
 if action='create_circle' then
  if not premium then raise exception 'Plus entitlement required' using errcode='42501'; end if;
  if exists(select 1 from together.circles where owner_id=uid and status in ('draft','open','active')) then raise exception 'One owned active circle maximum'; end if;
  bid := (payload->>'book_id')::uuid;
  if not exists(select 1 from together.books where id=bid and published) then raise exception 'Book unavailable'; end if;
  -- New circles are drafts, not advertised as real events; publisher approval required.
  insert into together.circles(book_id,owner_id,name,mode,city,public_venue,capacity)
  values(bid,uid,payload->>'name',payload->>'mode',nullif(payload->>'city',''),nullif(payload->>'public_venue',''),8) returning id into cid;
  insert into together.memberships(circle_id,user_id) values(cid,uid);
  return jsonb_build_object('id',cid,'status','draft');
 end if;
 cid := (payload->>'circle_id')::uuid;
 -- Circle row lock serializes capacity checks; no direct membership writes are granted.
 select * into c from together.circles where id=cid for update;
 if not found then raise exception 'Circle unavailable'; end if;
 if action='join' then
  if c.status <> 'open' then raise exception 'Circle is not open'; end if;
  if together_private.is_member(cid) then return '{"ok":true}'::jsonb; end if;
  if not premium and exists(select 1 from together.memberships m join together.circles x on x.id=m.circle_id where m.user_id=uid and x.status in ('draft','open','active')) then raise exception 'Free plan allows one active circle'; end if;
  select count(*) into n from together.memberships where circle_id=cid;
  if n>=c.capacity then raise exception 'Circle is full'; end if;
  if exists(select 1 from together.memberships m where m.circle_id=cid and together_private.is_blocked(m.user_id)) then raise exception 'Circle unavailable'; end if;
  insert into together.memberships(circle_id,user_id) values(cid,uid);
 elsif action='leave' then
  if c.owner_id=uid and c.status in ('draft','open','active') then raise exception 'Host must close their circle before leaving'; end if;
  delete from together.memberships where circle_id=cid and user_id=uid;
 else
  if not together_private.is_member(cid) then raise exception 'Circle membership required' using errcode='42501'; end if;
  if c.status not in ('open','active') then raise exception 'Circle is read-only'; end if;
  if action in ('post','progress') then
   ch := (payload->>'chapter')::integer;
   select chapters into n from together.books where id=c.book_id;
   if ch is null or ch<(case when action='post' then 1 else 0 end) or ch>n then raise exception 'Invalid chapter'; end if;
   if action='post' then
    insert into together.posts(circle_id,author_id,chapter,body) values(cid,uid,ch,payload->>'body') returning id into pid;
    return jsonb_build_object('id',pid);
   else
    insert into together.progress(user_id,circle_id,chapter) values(uid,cid,ch)
    on conflict(user_id,circle_id) do update set chapter=excluded.chapter,updated_at=now();
    if ch>0 then insert into together.badges(user_id,code) values(uid,'first-chapter') on conflict do nothing; end if;
    if ch=n then insert into together.badges(user_id,code) values(uid,'book-finished') on conflict do nothing; end if;
   end if;
  elsif action='vote' then
   bid := (payload->>'book_id')::uuid;
   if not exists(select 1 from together.books where id=bid and published) then raise exception 'Book unavailable'; end if;
   insert into together.next_book_votes values(uid,cid,bid) on conflict(user_id,circle_id) do update set book_id=excluded.book_id;
  else raise exception 'Unsupported action'; end if;
 end if;
 return '{"ok":true}'::jsonb;
end;
$$;
-- Exposed wrapper is SECURITY INVOKER; privileged implementation is in unexposed private schema.
create function together.command(action text, payload jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select together_private.command(action,payload); $$;
revoke all on all functions in schema together,together_private from public,anon,authenticated;
grant execute on function together.command(text,jsonb),together_private.command(text,jsonb),together_private.is_member(uuid),together_private.is_blocked(uuid),together_private.shares_circle(uuid) to authenticated;
commit;
