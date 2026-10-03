/* Together: entirely fictional, local-in-memory product demonstration. */
(function (root) {
  'use strict';
  const PEOPLE = {you:'You', sam:'Sam', alex:'Alex', priya:'Priya', morgan:'Morgan', jordan:'Jordan', taylor:'Taylor'};
  const CAPACITY = 6, MINIMUM = 4;
  function initialState() {
    return {confirmed:['you','sam','alex','priya','morgan'], queue:['taylor'], offer:'jordan', phase:'collecting', view:'organizer', log:['A spare seat was offered to Jordan, first in the standby queue.'], announcement:'Demo ready. Five people confirmed; Jordan has a seat offer.'};
  }
  function announce(s, text) { s.announcement=text; s.log.unshift(text); s.log=s.log.slice(0,6); }
  function promote(s) {
    if(s.phase!=='cancelled' && !s.offer && s.confirmed.length<CAPACITY && s.queue.length) {
      s.offer=s.queue.shift();
      announce(s, PEOPLE[s.offer]+' is next in line and has been offered a seat.');
    }
  }
  function reduce(state, action) {
    if(action.type==='reset') return initialState();
    const s={...state,confirmed:[...state.confirmed],queue:[...state.queue],log:[...state.log]};
    const id=action.id;
    if(action.type==='view' && ['organizer','you','jordan'].includes(id)) {s.view=id; return s;}
    if(s.phase==='cancelled') return s;
    if(action.type==='cancel' && s.confirmed.includes(id)) {
      s.confirmed=s.confirmed.filter(p=>p!==id);
      announce(s, PEOPLE[id]+' cancelled their RSVP.'); promote(s);
      if(s.phase==='going' && s.confirmed.length<MINIMUM) announce(s,'Late change: the group is below its four-person minimum. The organizer needs to decide whether to reschedule.');
    } else if(action.type==='rsvp' && PEOPLE[id] && !s.confirmed.includes(id) && s.offer!==id && !s.queue.includes(id)) {
      if(!s.offer && !s.queue.length && s.confirmed.length<CAPACITY) {s.confirmed.push(id);announce(s,PEOPLE[id]+' is confirmed.');}
      else {s.queue.push(id);announce(s,PEOPLE[id]+' joined the standby queue.');promote(s);}
    } else if(action.type==='leave' && s.queue.includes(id)) {
      s.queue=s.queue.filter(p=>p!==id);announce(s,PEOPLE[id]+' left the standby queue.');
    } else if(action.type==='accept' && s.offer===id && s.confirmed.length<CAPACITY) {
      s.offer=null;s.confirmed.push(id);announce(s,PEOPLE[id]+' accepted the seat and is confirmed.');promote(s);
    } else if((action.type==='decline'||action.type==='expire') && s.offer && (!id || id===s.offer)) {
      const who=s.offer;s.offer=null;announce(s,action.type==='expire'?PEOPLE[who]+"’s offer expired. No RSVP was added.":PEOPLE[who]+' declined the seat.');promote(s);
    } else if(action.type==='deadline' && s.phase==='collecting') {
      s.phase=s.confirmed.length>=MINIMUM?'going':'cancelled';
      if(s.phase==='cancelled') {s.offer=null;s.queue=[];announce(s,'Tuesday, 6 pm: only '+s.confirmed.length+' confirmed. This game night is cancelled; pending offers did not count.');}
      else announce(s,'Tuesday, 6 pm: '+s.confirmed.length+' confirmed. Game night is on! Any pending seat offer still needs an acceptance.');
    }
    return s;
  }
  function status(s) {
    if(s.phase==='cancelled')return {title:'This week is cancelled',className:'is-closed',detail:'The group did not reach four confirmed players by Tuesday at 6 pm.'};
    if(s.phase==='going'&&s.confirmed.length<MINIMUM)return {title:'A late change needs attention',className:'is-risk',detail:'Below the minimum after the decision. Fill a seat or coordinate a new plan with the group.'};
    if(s.phase==='going')return {title:'Game night is on',className:'is-ready',detail:'The minimum was met at the deadline. Everyone can plan around it.'};
    if(s.confirmed.length>=MINIMUM)return {title:'Looking good for Wednesday',className:'is-ready',detail:'You’ve reached the minimum. The final decision happens Tuesday at 6 pm.'};
    return {title:(MINIMUM-s.confirmed.length)+' more needed to make it happen',className:'is-risk',detail:'Only confirmed RSVPs count. Standby members and pending offers do not.'};
  }
  const api={initialState,reduce,status,PEOPLE,CAPACITY,MINIMUM};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  root.TogetherDemo=api;
  if(typeof document==='undefined') return;
  const app=document.querySelector('#demo-app');
  if(!app)return;
  let state=initialState();
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function button(label,type,id='',kind='',disabled=false){return `<button type="button" class="demo-button ${kind}" data-action="${type}" data-person="${id}" ${label==='Cancel'&&PEOPLE[id]?`aria-label="Cancel ${PEOPLE[id]}’s RSVP"`:''} ${disabled?'disabled':''}>${label}</button>`;}
  function memberPanel() {
    const id=state.view,name=PEOPLE[id],closed=state.phase==='cancelled';
    let content;
    if(closed) content='<p>This session is cancelled. Your RSVP is closed for this week.</p>';
    else if(state.confirmed.includes(id)) content=`<span class="demo-badge">You’re confirmed</span><p>Your seat is saved. If your plans change, let the group know with one click.</p>${button('Cancel my RSVP','cancel',id,'is-danger')}`;
    else if(state.offer===id) content=`<span class="demo-badge">A seat opened up</span><p>You’re next! Accept your offer to turn this held seat into a confirmed RSVP.</p><div class="demo-actions">${button('Accept my seat','accept',id,'is-primary')}${button('Decline offer','decline',id)}</div><p class="demo-note">This simulated offer expires when the organizer advances its timer.</p>`;
    else if(state.queue.includes(id)) content=`<span class="demo-badge">Standby · ${state.queue.indexOf(id)+1} in queue</span><p>We’ll offer you a seat in order if a place opens up.</p>${button('Leave standby','leave',id)}`;
    else content=`<p>${state.confirmed.length>=CAPACITY||state.offer?'Join the standby queue. Seats are offered in order.':'There’s room at the table. Come along?'}</p>${button(state.confirmed.length>=CAPACITY||state.offer?'Join standby':'RSVP yes','rsvp',id,'is-primary')}`;
    return `<section class="demo-card"><div class="demo-card-header"><h3>Your RSVP</h3><span class="demo-eyebrow">${name}’s view</span></div>${content}</section>`;
  }
  function person(id,detail,action='') {return `<li class="demo-person"><span class="demo-avatar" aria-hidden="true">${PEOPLE[id].slice(0,1)}</span><span class="demo-person-info"><strong>${PEOPLE[id]}</strong><small>${detail}</small></span>${action}</li>`;}
  function render() {
    const st=status(state),organizer=state.view==='organizer',closed=state.phase==='cancelled';
    const seats=Array.from({length:CAPACITY},(_,i)=>{const id=state.confirmed[i],offered=!id&&i===state.confirmed.length&&state.offer&&!closed;return `<div class="demo-seat ${id?'is-filled':offered?'is-offered':''}"><span aria-hidden="true">${id?PEOPLE[id].slice(0,1):offered?'↗':'+'}</span><small>${id?PEOPLE[id]:offered?'Offer sent':'Open seat'}</small></div>`;}).join('');
    app.innerHTML=`<div class="demo-shell">
      <div class="demo-toolbar"><div><span class="demo-eyebrow">ONE GROUP. ONE CLEAR PLAN.</span><p>Try a change. See the whole group stay in sync.</p></div><div class="demo-view-switch" role="group" aria-label="Switch demo role">${[['organizer','Organizer'],['you','Member · You'],['jordan','Member · Jordan']].map(([id,label])=>`<button type="button" data-action="view" data-person="${id}" aria-pressed="${state.view===id}">${label}</button>`).join('')}</div></div>
      <div class="demo-grid"><div class="demo-main">
        <section class="demo-card demo-event"><div class="demo-card-header"><span class="demo-eyebrow">THE WEDNESDAY TABLE</span><span class="demo-badge">Weekly · Fictional group</span></div><h2>Same table.<br>New favorite game.</h2><p class="demo-meta">Wednesday · 7–9 pm <span aria-hidden="true">/</span> Maple Street Café</p>
        <div class="demo-status ${st.className}"><span class="demo-status-dot" aria-hidden="true"></span><div><strong>${st.title}</strong><p>${st.detail}</p></div></div>
        <div class="demo-metrics"><div class="demo-metric"><strong>${state.confirmed.length}<span> / 6</span></strong><small>confirmed</small></div><div class="demo-metric"><strong>4</strong><small>needed to play</small></div><div class="demo-metric"><strong>${state.offer&&!closed?1:0}</strong><small>pending offer</small></div></div>
        <div class="demo-seats" aria-label="Six seat map">${seats}</div><p class="demo-note">Decision deadline: Tuesday, 6 pm${state.phase!=='collecting'?' · Reached':''}. Pending offers don’t count toward the minimum.</p></section>
        <section class="demo-card"><div class="demo-card-header"><h3>Who’s coming</h3><span class="demo-badge">${state.confirmed.length} confirmed${closed?' before cancellation':''}</span></div><ul class="demo-people">${state.confirmed.map(id=>person(id,closed?'RSVP closed':id==='you'?'That’s you':'Confirmed',organizer&&!closed?button('Cancel','cancel',id,'is-small'):'' )).join('')||'<li class="demo-note">No confirmed players yet.</li>'}</ul></section>
      </div><aside class="demo-sidebar" aria-label="RSVP controls and activity">
        ${organizer?`<section class="demo-card"><span class="demo-eyebrow">YOU’RE THE ORGANIZER</span><h3>A plan, without the chase.</h3><p>Cancel a player’s RSVP to see the queue respond. Move to the deadline to make the call.</p><div class="demo-actions demo-actions-stack">${button('Advance to Tuesday, 6 pm','deadline','','is-primary',state.phase!=='collecting')}${button('Expire current seat offer','expire','','',!state.offer||closed)}</div><p class="demo-note">Try cancelling two confirmed players, then advance the deadline to see the below-minimum outcome.</p></section>`:memberPanel()}
        <section class="demo-card"><div class="demo-card-header"><h3>Next in line</h3><span class="demo-badge">${state.queue.length+(state.offer?1:0)} waiting</span></div>${state.offer?`<div class="demo-offer"><p><strong>${PEOPLE[state.offer]} has a seat offer</strong></p><p class="demo-note">A place is held until they accept, decline, or the offer expires.</p>${organizer?`<div class="demo-actions">${button('Simulate accept','accept',state.offer,'is-primary')}${button('Decline','decline',state.offer)}</div>`:''}</div>`:''}<ol class="demo-people">${state.queue.map((id,i)=>person(id,`Standby position ${i+1}`)).join('')}</ol>${!state.queue.length&&!state.offer?'<p class="demo-note">'+(closed?'Standby closed for this session.':'No one waiting. Everyone is up to date.')+'</p>':''}<p class="demo-note">First in, first offered. Only one live offer at a time.</p></section>
        <section class="demo-card"><h3>The latest</h3><ul class="demo-log">${state.log.map(t=>`<li>${escape(t)}</li>`).join('')}</ul></section>
      </aside></div><div class="demo-footer"><p class="demo-note">Sandbox only. Fictional members, simulated notifications, no messages sent. Refreshing resets everything.</p>${button('Reset demo','reset')}</div><p class="demo-live" role="status" aria-live="polite" aria-atomic="true"></p></div>`;
    // Live region text is added after it exists so assistive technology detects updates.
    requestAnimationFrame(()=>{const live=app.querySelector('.demo-live');if(live)live.textContent=state.announcement;});
  }
  app.addEventListener('click',event=>{
    const target=event.target.closest('button[data-action]');if(!target||target.disabled)return;
    const type=target.dataset.action,id=target.dataset.person;
    state=reduce(state,{type,id});render();
    const same=Array.from(app.querySelectorAll('button[data-action]')).find(b=>b.dataset.action===type&&b.dataset.person===id&&!b.disabled);
    if(same)same.focus({preventScroll:true});
    else {const next=app.querySelector('.demo-live');next.tabIndex=-1;next.focus({preventScroll:true});}
  });
  render();
})(typeof window!=='undefined'?window:globalThis);
