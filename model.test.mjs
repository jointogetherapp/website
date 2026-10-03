import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOKS, CIRCLES, STORAGE_KEY, POST_MAX_LENGTH, MAX_SAVED_POSTS,
  createDefaultState, normalizeState, reducer, loadState, saveState,
  getBook, getCircle, getCurrentBook, getChapterPrompts, getReadingProgress,
  getCompletionBadge, getReadingSchedule, getBadges, validatePost, isValidDate,
} from './model.mjs';

const pride = 'pride-and-prejudice';
const time = 'the-time-machine';
const joinPayload = { circleId: 'slow-sundays', bookId: pride, startDate: '2026-10-04', pace: 3 };
const joined = () => reducer(createDefaultState(), { type: 'JOIN_CIRCLE', payload: joinPayload });
const postPayload = { circleId: 'slow-sundays', bookId: pride, chapter: 1, body: 'An original reflection.', createdAt: '2026-10-04T12:00:00Z' };

test('book editions, chapter counts, and circle formats are explicit and immutable', () => {
  assert.equal(getBook(pride).chapterCount, 61);
  assert.equal(getBook(time).chapterCount, 17);
  assert.equal(getBook(time).chapters.at(-1).label, 'Epilogue');
  assert.equal(getBook(time).chapters[15].label, 'Chapter 16');
  assert.deepEqual(CIRCLES.map(c => c.format).sort(), ['in-person', 'virtual']);
  assert.deepEqual(CIRCLES[0].bookIds, CIRCLES[1].bookIds);
  assert.ok(CIRCLES.every(c => c.isSample));
  assert.ok(Object.isFrozen(BOOKS[0].chapters));
  assert.equal(getBook('missing'), null);
  assert.equal(getCircle('missing'), null);
});

test('defaults contain no fabricated members, reflections, votes, or completed books', () => {
  const a = createDefaultState();
  const b = createDefaultState();
  a.profile.name = 'Changed';
  a.posts.push({});
  assert.equal(b.profile.name, 'Reader');
  assert.equal(b.activeCircle, null);
  assert.deepEqual(b.posts, []);
  assert.deepEqual(b.votes, {});
  assert.equal(getCurrentBook(b), null);
  assert.equal(getCompletionBadge(b, pride), null);
});

test('normalization survives invalid values and ignores unrecognized versions', () => {
  for (const value of [null, undefined, '', 5, [], true, { version: 99 }]) {
    assert.deepEqual(normalizeState(value), createDefaultState());
  }
  const state = normalizeState({ profile: { name: '   ', bio: 'x'.repeat(500) }, progress: { [pride]: 999, [time]: -8 }, preferences: { hideSpoilers: 'false', unknown: true } });
  assert.equal(state.profile.name, 'Reader');
  assert.equal(state.profile.bio.length, 280);
  assert.equal(state.progress[pride], 61);
  assert.equal(state.progress[time], 0);
  assert.deepEqual(state.preferences, { hideSpoilers: true, readingReminders: false, format: 'either' });
  assert.deepEqual(normalizeState(state), state);
});

test('malformed persisted fields cannot add prototype keys or unknown content', () => {
  const raw = JSON.parse('{"__proto__":{"polluted":true},"progress":{"__proto__":7},"votes":{"__proto__":"the-time-machine"},"preferences":{"__proto__":true}}');
  assert.deepEqual(normalizeState(raw), createDefaultState());
  assert.equal({}.polluted, undefined);
});

test('one active circle includes book, start, and weekly pace; switching preserves personal progress', () => {
  const first = reducer(joined(), { type: 'SET_PROGRESS', payload: { bookId: pride, chapter: 4 } });
  const second = reducer(first, { type: 'JOIN_CIRCLE', payload: { circleId: 'around-the-table', bookId: time, startDate: '2026-10-05', pace: 2 } });
  assert.equal(second.activeCircle.circleId, 'around-the-table');
  assert.equal(second.activeCircle.bookId, time);
  assert.equal(second.activeCircle.pace, 2);
  assert.equal(second.progress[pride], 4);
  assert.equal(getCurrentBook(second).id, time);
  assert.equal(reducer(second, { type: 'LEAVE_CIRCLE' }).activeCircle, null);
});

test('invalid joins cannot replace an existing membership', () => {
  for (const patch of [{ circleId: 'fake' }, { bookId: 'fake' }, { startDate: '2026-02-30' }, { startDate: 'yesterday' }]) {
    assert.deepEqual(reducer(joined(), { type: 'JOIN_CIRCLE', payload: { ...joinPayload, ...patch } }), joined());
  }
  assert.equal(reducer(joined(), { type: 'JOIN_CIRCLE', payload: { ...joinPayload, pace: 99 } }).activeCircle.pace, 21);
  assert.equal(reducer(joined(), { type: 'JOIN_CIRCLE', payload: { ...joinPayload, pace: 'invalid' } }).activeCircle.pace, 3);
});

test('progress clamps values and a self-reported badge is derived, never independently stored', () => {
  let state = joined();
  state = reducer(state, { type: 'SET_PROGRESS', payload: { bookId: pride, chapter: 99 } });
  assert.deepEqual(getReadingProgress(state), { chapter: 61, total: 61, percent: 100, isComplete: true, nextChapter: null });
  assert.equal(getCompletionBadge(state).selfReported, true);
  state = reducer(state, { type: 'SET_PROGRESS', payload: { bookId: pride, chapter: 60 } });
  assert.equal(getCompletionBadge(state), null);
  state = reducer(state, { type: 'SET_PROGRESS', payload: { bookId: pride, chapter: '-4' } });
  assert.equal(state.progress[pride], 0);
  for (const chapter of [NaN, Infinity, '', null, {}, []]) {
    assert.deepEqual(reducer(state, { type: 'SET_PROGRESS', payload: { bookId: pride, chapter } }), state);
  }
  assert.equal(reducer(state, { type: 'SET_PROGRESS', payload: { bookId: pride, chapter: 4.9 } }).progress[pride], 4);
});

test('profile updates are bounded, partial, and independent of old post author names', () => {
  const first = reducer(joined(), { type: 'UPDATE_PROFILE', payload: { name: '  Jo  ', bio: 'Loves books.' } });
  const posted = reducer(first, { type: 'ADD_POST', payload: postPayload });
  const changed = reducer(posted, { type: 'UPDATE_PROFILE', payload: { name: 'Ana' } });
  assert.equal(changed.profile.bio, 'Loves books.');
  assert.equal(changed.posts[0].authorName, 'Jo');
  assert.equal(first.posts.length, 0);
});

test('avatars and format preferences accept only their declared choices', () => {
  const state = reducer(joined(), { type: 'UPDATE_PROFILE', payload: { avatar: 'flower' } });
  assert.equal(state.profile.avatar, 'flower');
  assert.equal(reducer(state, { type: 'UPDATE_PROFILE', payload: { bio: 'My local introduction.' } }).profile.avatar, 'flower');
  assert.equal(reducer(state, { type: 'UPDATE_PROFILE', payload: { avatar: 'unknown' } }).profile.avatar, 'sun');
  const preference = reducer(state, { type: 'SET_PREFERENCE', payload: { key: 'format', value: 'in-person' } });
  assert.equal(preference.preferences.format, 'in-person');
  assert.equal(normalizeState(preference).preferences.format, 'in-person');
  assert.equal(reducer(preference, { type: 'SET_PREFERENCE', payload: { key: 'format', value: true } }).preferences.format, 'in-person');
});

test('badge gallery derives first check-in, local post, and completion from current state', () => {
  assert.ok(getBadges(createDefaultState()).every(badge => !badge.earned));
  const progressed = reducer(joined(), { type: 'SET_PROGRESS', payload: { bookId: pride, chapter: 61 } });
  const posted = reducer(progressed, { type: 'ADD_POST', payload: postPayload });
  const badges = getBadges(posted);
  assert.equal(badges.find(badge => badge.id === 'first-check-in').earned, true);
  assert.equal(badges.find(badge => badge.id === 'first-local-post').earned, true);
  assert.equal(badges.find(badge => badge.id === `finished-${pride}`).earned, true);
  assert.equal(badges.find(badge => badge.id === `finished-${time}`).earned, false);
  assert.ok(getBadges(reducer(posted, { type: 'RESET' })).every(badge => !badge.earned));
});

test('adding a chapter reflection is deterministic and records only the local reader', () => {
  const action = { type: 'ADD_POST', payload: { ...postPayload, body: '  Good opening.  ' } };
  const a = reducer(joined(), action);
  const b = reducer(joined(), action);
  assert.deepEqual(a, b);
  assert.deepEqual(a.posts[0], { id: 'local-1', circleId: 'slow-sundays', bookId: pride, chapter: 1, body: 'Good opening.', authorName: 'Reader', createdAt: '2026-10-04T12:00:00.000Z', isLocal: true });
  const next = reducer(a, action);
  assert.equal(next.posts[1].id, 'local-2');
  assert.equal(next.nextPostId, 3);
});

test('empty, oversized, invalid-chapter, and unjoined reflections are rejected', () => {
  for (const patch of [{ body: '  \n\t ' }, { body: 'x'.repeat(POST_MAX_LENGTH + 1) }, { body: 42 }, { chapter: 0 }, { chapter: 62 }, { chapter: 1.5 }, { circleId: 'around-the-table' }, { bookId: time }]) {
    const payload = { ...postPayload, ...patch };
    assert.equal(typeof validatePost(payload, joined()), 'string');
    assert.deepEqual(reducer(joined(), { type: 'ADD_POST', payload }), joined());
  }
  assert.equal(reducer(createDefaultState(), { type: 'ADD_POST', payload: postPayload }).posts.length, 0);
  assert.equal(validatePost({ ...postPayload, body: 'x'.repeat(POST_MAX_LENGTH) }, joined()), null);
});

test('persisted posts are bounded, sanitized, and de-duplicated', () => {
  const post = reducer(joined(), { type: 'ADD_POST', payload: postPayload }).posts[0];
  const normalized = normalizeState({ posts: [post, post, { ...post, id: 'unsafe' }, null, { ...post, id: 'local-2', body: '' }] });
  assert.equal(normalized.posts.length, 1);
  assert.equal(normalized.nextPostId, 2);
  const many = normalizeState({ posts: Array.from({ length: MAX_SAVED_POSTS + 4 }, (_, i) => ({ ...post, id: `local-${i + 1}` })) });
  assert.equal(many.posts.length, MAX_SAVED_POSTS);
  assert.equal(many.nextPostId, MAX_SAVED_POSTS + 5);
});

test('malformed high post counters still produce unique, persistent IDs', () => {
  const first = reducer({ ...joined(), nextPostId: Number.MAX_VALUE }, { type: 'ADD_POST', payload: postPayload });
  const next = reducer(first, { type: 'ADD_POST', payload: postPayload });
  assert.equal(next.posts.length, 2);
  assert.notEqual(next.posts[0].id, next.posts[1].id);
  assert.deepEqual(normalizeState(next), next);
});

test('voting stores one replaceable local choice in the active circle', () => {
  const first = reducer(joined(), { type: 'VOTE', payload: { circleId: 'slow-sundays', bookId: time } });
  const second = reducer(first, { type: 'VOTE', payload: { circleId: 'slow-sundays', bookId: pride } });
  assert.deepEqual(first.votes, { 'slow-sundays': time });
  assert.deepEqual(second.votes, { 'slow-sundays': pride });
  assert.deepEqual(reducer(second, { type: 'VOTE', payload: { circleId: 'around-the-table', bookId: time } }), second);
});

test('only declared boolean preferences can change', () => {
  const state = reducer(joined(), { type: 'SET_PREFERENCE', payload: { key: 'hideSpoilers', value: false } });
  assert.equal(state.preferences.hideSpoilers, false);
  for (const payload of [{ key: '__proto__', value: true }, { key: 'unknown', value: true }, { key: 'hideSpoilers', value: 'false' }]) {
    assert.deepEqual(reducer(state, { type: 'SET_PREFERENCE', payload }), state);
  }
});

test('chapter prompts match known early chapters and are independently copied', () => {
  assert.match(getChapterPrompts(pride, 1).join(' '), /Bingley/);
  assert.match(getChapterPrompts(pride, 3).join(' '), /assembly/);
  assert.match(getChapterPrompts(time, 1).join(' '), /fourth dimension/);
  assert.match(getChapterPrompts(time, 2).join(' '), /model/);
  assert.match(getChapterPrompts(time, 3).join(' '), /dinner/);
  assert.match(getChapterPrompts(time, 17).join(' '), /epilogue/);
  const prompts = getChapterPrompts(pride, 1);
  prompts[0] = 'Changed';
  assert.notEqual(getChapterPrompts(pride, 1)[0], 'Changed');
  assert.deepEqual(getChapterPrompts(pride, 62), []);
  assert.deepEqual(getChapterPrompts('missing', 1), []);
});

test('weekly schedule covers each chapter exactly once and respects leap years', () => {
  const state = reducer(joined(), { type: 'JOIN_CIRCLE', payload: { ...joinPayload, bookId: time, startDate: '2028-02-27', pace: 3 } });
  const schedule = getReadingSchedule(state);
  assert.equal(schedule.length, 6);
  assert.equal(schedule[0].dueDate, '2028-03-04');
  assert.equal(schedule[1].startDate, '2028-03-05');
  assert.equal(schedule.at(-1).toChapter, 17);
  assert.match(schedule.at(-1).label, /Epilogue/);
  assert.deepEqual(schedule.flatMap(week => Array.from({ length: week.toChapter - week.fromChapter + 1 }, (_, i) => week.fromChapter + i)), Array.from({ length: 17 }, (_, i) => i + 1));
  assert.deepEqual(getReadingSchedule(createDefaultState()), []);
  assert.equal(isValidDate('2028-02-29'), true);
  assert.equal(isValidDate('2026-02-29'), false);
  assert.equal(isValidDate('2026-2-1'), false);
});

test('storage round trip persists everything, reset removes state through normal saving', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const state = reducer(joined(), { type: 'ADD_POST', payload: postPayload });
  assert.equal(saveState(state, storage), true);
  assert.ok(values.has(STORAGE_KEY));
  assert.deepEqual(loadState(storage), state);
  assert.equal(saveState(reducer(state, { type: 'RESET' }), storage), true);
  assert.deepEqual(loadState(storage), createDefaultState());
});

test('unavailable, full, corrupt, and wrong-shaped storage degrade safely', () => {
  for (const raw of [null, '{invalid', 'null', '[]', 'true', '99', '"text"', '{"version":999}', 'x'.repeat(2_000_001)]) {
    assert.deepEqual(loadState({ getItem: () => raw }), createDefaultState());
  }
  const blocked = { getItem: () => { throw new Error('Denied'); }, setItem: () => { throw new Error('Quota'); } };
  assert.deepEqual(loadState(blocked), createDefaultState());
  assert.equal(saveState(joined(), blocked), false);
  assert.deepEqual(loadState(null), createDefaultState());
  assert.equal(saveState(joined(), null), false);
  assert.deepEqual(loadState(), createDefaultState());
});

test('unknown actions are harmless and reset returns fresh defaults', () => {
  const state = joined();
  assert.deepEqual(reducer(state, null), state);
  assert.deepEqual(reducer(state, { type: 'UNKNOWN' }), state);
  assert.deepEqual(reducer(state, { type: 'RESET' }), createDefaultState());
  assert.deepEqual(reducer(undefined, undefined), createDefaultState());
});
