/** Together's browser-local preview model. No network, DOM, accounts, or payments. */

export const STORAGE_KEY = 'together-reading:v1';
export const POST_MAX_LENGTH = 2000;
export const MAX_SAVED_POSTS = 300;
export const AVATARS = Object.freeze(['sun', 'leaf', 'moon', 'flower']);
export const FORMATS = Object.freeze(['either', 'virtual', 'in-person']);
const VERSION = 1;
const MAX_STORAGE_LENGTH = 2_000_000;
const MAX_POST_ID = Number.MAX_SAFE_INTEGER - 1;
const DAY_MS = 86_400_000;

const timeMachineTitles = [
  'Introduction', 'The Machine', 'The Time Traveller Returns', 'Time Travelling',
  'In the Golden Age', 'The Sunset of Mankind', 'A Sudden Shock', 'Explanation',
  'The Morlocks', 'When Night Came', 'The Palace of Green Porcelain',
  'In the Darkness', 'The Trap of the White Sphinx', 'The Further Vision',
  'The Time Traveller’s Return', 'After the Story', 'Epilogue',
];

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const BOOKS = deepFreeze([
  {
    id: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: 1813,
    genre: 'Classic fiction',
    description: 'First impressions, second chances, and the fine art of changing your mind.',
    chapterCount: 61,
    chapters: Array.from({ length: 61 }, (_, i) => ({ number: i + 1, title: `Chapter ${i + 1}`, label: `Chapter ${i + 1}` })),
    sourceUrl: 'https://www.gutenberg.org/ebooks/1342',
    editionNote: '61 chapters, numbered continuously as in the linked Project Gutenberg edition.',
    color: '#bd684f',
  },
  {
    id: 'the-time-machine',
    title: 'The Time Machine',
    author: 'H. G. Wells',
    year: 1895,
    genre: 'Science fiction',
    description: 'A journey into the distant future, and a conversation about the world we make.',
    chapterCount: 17,
    chapters: timeMachineTitles.map((title, i) => ({ number: i + 1, title, label: i === 16 ? 'Epilogue' : `Chapter ${i + 1}` })),
    sourceUrl: 'https://www.gutenberg.org/ebooks/35',
    editionNote: '16 numbered chapters plus the Epilogue: 17 reading sections in the linked Project Gutenberg edition. Other editions divide the text differently.',
    color: '#356563',
  },
]);

// Both formats have the same free features. These are explicitly sample circles,
// not representations of real groups, venues, available seats, or members.
export const CIRCLES = deepFreeze([
  {
    id: 'slow-sundays',
    name: 'Slow Sundays',
    format: 'virtual',
    eyebrow: 'A little distance, a lot in common',
    description: 'Make room for a few chapters and a thoughtful conversation, wherever you are.',
    location: 'Online · sample circle',
    bookIds: BOOKS.map(book => book.id),
    defaultBookId: 'pride-and-prejudice',
    defaultPace: 3,
    isSample: true,
  },
  {
    id: 'around-the-table',
    name: 'Around the Table',
    format: 'in-person',
    eyebrow: 'A good book, in good company',
    description: 'A template for a local reading circle. Pick the place and make the time together.',
    location: 'Choose your own venue · sample circle',
    bookIds: BOOKS.map(book => book.id),
    defaultBookId: 'the-time-machine',
    defaultPace: 3,
    isSample: true,
  },
]);

// Original discussion prompts, keyed to the chapter boundaries of each linked
// edition. Later chapters receive open reading questions, not invented summaries.
const CHAPTER_PROMPTS = deepFreeze({
  'pride-and-prejudice': {
    1: [
      'What do Mr. and Mrs. Bennet’s different reactions to Bingley’s arrival tell you about their marriage?',
      'How does the opening conversation connect marriage, money, and family expectations?',
      'Where do you hear irony in the way this chapter introduces the Bennet household?',
    ],
    2: [
      'Mr. Bennet has already visited Bingley before he tells his family. What does that reveal about his humor?',
      'How does Austen create surprise in a chapter built largely from conversation?',
      'Who seems to have power in the Bennet household, and how do they use it?',
    ],
    3: [
      'At the assembly, how much of the judgment of Bingley and Darcy comes from behavior, and how much from expectation?',
      'What do Elizabeth’s reactions to Darcy’s slight suggest about how she handles embarrassment?',
      'Which first impression in this chapter would you be most reluctant to trust?',
    ],
    4: [
      'What changes when Jane and Elizabeth discuss the evening privately?',
      'How do the sisters’ different readings of Bingley and his sisters reveal their own characters?',
      'What does Bingley’s friendship with Darcy suggest about their differences?',
    ],
    5: [
      'How does the Lucas family’s visit turn a single evening into a shared account of what happened?',
      'What distinction does Mary make between pride and vanity? Does it fit what you have seen so far?',
      'How does Elizabeth’s comment about Darcy reveal a personal stake in the discussion of pride?',
    ],
    6: [
      'How do Charlotte and Elizabeth differ on whether Jane should make her feelings more obvious?',
      'What do you make of Charlotte’s practical view of happiness in marriage?',
      'How does Darcy’s growing interest in Elizabeth complicate their first meeting?',
    ],
    7: [
      'What does Mrs. Bennet’s plan for Jane’s journey to Netherfield reveal about her priorities?',
      'What does Elizabeth’s decision to walk to her sick sister show us about her?',
      'How do different characters respond to Elizabeth’s arrival, and what values lie behind those reactions?',
    ],
    8: [
      'How does the conversation about an accomplished woman reveal the speakers’ expectations?',
      'What separates what Bingley’s sisters say to Elizabeth from what they say in her absence?',
      'How does Elizabeth participate in the Netherfield conversation without simply accepting its terms?',
    ],
  },
  'the-time-machine': {
    1: [
      'How does the Time Traveller explain time as a fourth dimension to his guests?',
      'Which objections to his argument seem strongest to you at this point?',
      'What effect does the comfortable dinner-party setting have on this extraordinary discussion?',
    ],
    2: [
      'What details of the model demonstration make the narrator treat it as credible evidence?',
      'Why might it matter that the Psychologist, rather than the inventor, moves the model’s lever?',
      'How do the guests respond differently to an event they cannot readily explain?',
    ],
    3: [
      'How does the Time Traveller’s injured, exhausted appearance change the atmosphere at dinner?',
      'Why does the narrator say that the Time Traveller is difficult to believe?',
      'What expectations does the delayed telling of his story create for you?',
    ],
    4: [
      'How does Wells describe the physical experience of moving through time?',
      'What fears compete with the Traveller’s curiosity as the journey accelerates?',
      'How does the arrival in an unfamiliar landscape shift the tone of the chapter?',
    ],
  },
});

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value, max, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

function finiteNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function boundedInteger(value, min, max, fallback) {
  const number = finiteNumber(value);
  return number === null ? fallback : Math.max(min, Math.min(max, Math.floor(number)));
}

export function getBook(id) { return BOOKS.find(book => book.id === id) || null; }
export function getCircle(id) { return CIRCLES.find(circle => circle.id === id) || null; }

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTimestamp(value) {
  return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString() : null;
}

export function createDefaultState() {
  return {
    version: VERSION,
    profile: { name: 'Reader', bio: '', avatar: 'sun' },
    activeCircle: null,
    progress: Object.fromEntries(BOOKS.map(book => [book.id, 0])),
    posts: [],
    nextPostId: 1,
    votes: {},
    preferences: { hideSpoilers: true, readingReminders: false, format: 'either' },
  };
}

function normalizeMembership(value) {
  if (!isRecord(value)) return null;
  const circle = getCircle(value.circleId);
  const book = getBook(value.bookId);
  if (!circle || !book || !circle.bookIds.includes(book.id) || !isValidDate(value.startDate)) return null;
  return {
    circleId: circle.id,
    bookId: book.id,
    startDate: value.startDate,
    pace: boundedInteger(value.pace, 1, 21, circle.defaultPace),
  };
}

function normalizePost(value) {
  if (!isRecord(value)) return null;
  const circle = getCircle(value.circleId);
  const book = getBook(value.bookId);
  const chapter = finiteNumber(value.chapter);
  const body = typeof value.body === 'string' ? value.body.trim() : '';
  if (!circle || !book || !circle.bookIds.includes(book.id) || !Number.isInteger(chapter)
      || chapter < 1 || chapter > book.chapterCount || !body || body.length > POST_MAX_LENGTH
      || typeof value.id !== 'string' || !/^local-[1-9]\d{0,15}$/.test(value.id)
      || Number(value.id.slice(6)) > MAX_POST_ID) return null;
  return {
    id: value.id, circleId: circle.id, bookId: book.id, chapter, body,
    authorName: cleanString(value.authorName, 60, 'Reader') || 'Reader',
    createdAt: validTimestamp(value.createdAt),
    isLocal: true,
  };
}

/** Returns a fresh, bounded JSON-safe state. Unknown fields are intentionally dropped. */
export function normalizeState(value) {
  const result = createDefaultState();
  if (!isRecord(value) || (value.version !== undefined && value.version !== VERSION)) return result;
  if (isRecord(value.profile)) {
    result.profile = {
      name: cleanString(value.profile.name, 60, 'Reader') || 'Reader',
      bio: cleanString(value.profile.bio, 280),
      avatar: AVATARS.includes(value.profile.avatar) ? value.profile.avatar : 'sun',
    };
  }
  result.activeCircle = normalizeMembership(value.activeCircle);
  if (isRecord(value.progress)) {
    for (const book of BOOKS) result.progress[book.id] = boundedInteger(value.progress[book.id], 0, book.chapterCount, 0);
  }
  if (Array.isArray(value.posts)) {
    const ids = new Set();
    result.posts = value.posts.slice(-MAX_SAVED_POSTS).map(normalizePost).filter(post => {
      if (!post || ids.has(post.id)) return false;
      ids.add(post.id);
      return true;
    });
  }
  const lastId = result.posts.reduce((max, post) => Math.max(max, Number(post.id.slice(6))), 0);
  const requestedNextId = boundedInteger(value.nextPostId, 1, MAX_POST_ID, 1);
  result.nextPostId = lastId >= MAX_POST_ID ? requestedNextId : Math.max(lastId + 1, requestedNextId);
  if (isRecord(value.votes)) {
    for (const circle of CIRCLES) {
      const bookId = value.votes[circle.id];
      if (circle.bookIds.includes(bookId)) result.votes[circle.id] = bookId;
    }
  }
  if (isRecord(value.preferences)) {
    for (const key of ['hideSpoilers', 'readingReminders']) {
      if (typeof value.preferences[key] === 'boolean') result.preferences[key] = value.preferences[key];
    }
    if (FORMATS.includes(value.preferences.format)) result.preferences.format = value.preferences.format;
  }
  return result;
}

/** Return an actionable validation message, or null. Posts never leave this browser. */
export function validatePost(payload, state) {
  if (!isRecord(payload)) return 'Write a reflection first.';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (!body) return 'Write a reflection first.';
  if (body.length > POST_MAX_LENGTH) return `Keep your reflection to ${POST_MAX_LENGTH} characters or fewer.`;
  const membership = normalizeMembership(state?.activeCircle);
  if (!membership || membership.circleId !== payload.circleId || membership.bookId !== payload.bookId) {
    return 'Join this circle and book before adding a reflection.';
  }
  const book = getBook(payload.bookId);
  const chapter = finiteNumber(payload.chapter);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapterCount) {
    return 'Choose a valid chapter for your reflection.';
  }
  return null;
}

/** Pure reducer. Provide payload.createdAt from the UI if a post needs a timestamp. */
export function reducer(input, action) {
  const state = normalizeState(input);
  if (!isRecord(action)) return state;
  const payload = isRecord(action.payload) ? action.payload : {};
  switch (action.type) {
    case 'JOIN_CIRCLE': {
      const activeCircle = normalizeMembership(payload);
      return activeCircle ? { ...state, activeCircle } : state;
    }
    case 'LEAVE_CIRCLE':
      return { ...state, activeCircle: null };
    case 'UPDATE_PROFILE':
      return normalizeState({ ...state, profile: { ...state.profile, ...payload } });
    case 'SET_PROGRESS': {
      const book = getBook(payload.bookId);
      if (!book || finiteNumber(payload.chapter) === null) return state;
      return { ...state, progress: { ...state.progress, [book.id]: boundedInteger(payload.chapter, 0, book.chapterCount, 0) } };
    }
    case 'ADD_POST': {
      if (validatePost(payload, state)) return state;
      // The ID counter belongs to state, so replaying the same action is deterministic.
      let nextId = state.nextPostId;
      const ids = new Set(state.posts.map(post => post.id));
      while (ids.has(`local-${nextId}`)) nextId = nextId >= MAX_POST_ID ? 1 : nextId + 1;
      const post = {
        id: `local-${nextId}`,
        circleId: payload.circleId,
        bookId: payload.bookId,
        chapter: Number(payload.chapter),
        body: payload.body.trim(),
        authorName: state.profile.name,
        createdAt: validTimestamp(payload.createdAt),
        isLocal: true,
      };
      return { ...state, posts: [...state.posts, post].slice(-MAX_SAVED_POSTS), nextPostId: nextId >= MAX_POST_ID ? 1 : nextId + 1 };
    }
    case 'VOTE': {
      const circle = getCircle(payload.circleId);
      if (!circle || !circle.bookIds.includes(payload.bookId) || state.activeCircle?.circleId !== circle.id) return state;
      return { ...state, votes: { ...state.votes, [circle.id]: payload.bookId } };
    }
    case 'SET_PREFERENCE':
      if (payload.key === 'format') {
        return FORMATS.includes(payload.value) ? { ...state, preferences: { ...state.preferences, format: payload.value } } : state;
      }
      if (!Object.hasOwn(state.preferences, payload.key) || typeof payload.value !== 'boolean') return state;
      return { ...state, preferences: { ...state.preferences, [payload.key]: payload.value } };
    case 'RESET':
      return createDefaultState();
    default:
      return state;
  }
}

export function getCurrentBook(state) { return getBook(state?.activeCircle?.bookId); }

export function getChapterPrompts(bookId, chapter) {
  const book = getBook(bookId);
  const number = finiteNumber(chapter);
  if (!book || !Number.isInteger(number) || number < 1 || number > book.chapterCount) return [];
  const specific = CHAPTER_PROMPTS[bookId]?.[number];
  if (specific) return [...specific];
  const label = book.chapters[number - 1].label.toLowerCase();
  return [
    `Which moment in ${label} stayed with you, and why?`,
    `Did ${label} change how you understand a character or idea? What in the text caused that change?`,
    `What question would you bring to the circle after reading ${label}?`,
  ];
}

export function getReadingProgress(state, bookId = state?.activeCircle?.bookId) {
  const book = getBook(bookId);
  if (!book) return { chapter: 0, total: 0, percent: 0, isComplete: false, nextChapter: null };
  const chapter = boundedInteger(state?.progress?.[book.id], 0, book.chapterCount, 0);
  return { chapter, total: book.chapterCount, percent: Math.round(chapter / book.chapterCount * 100), isComplete: chapter === book.chapterCount, nextChapter: chapter < book.chapterCount ? chapter + 1 : null };
}

/** Completion is self-reported, not externally verified or certified. */
export function getCompletionBadge(state, bookId = state?.activeCircle?.bookId) {
  const book = getBook(bookId);
  if (!book || !getReadingProgress(state, book.id).isComplete) return null;
  return { id: `finished-${book.id}`, bookId: book.id, title: 'A story, finished', description: `Finished ${book.title}`, selfReported: true };
}

/** All badge cards, including unearned ones. Badges are computed, never stored. */
export function getBadges(state) {
  const current = normalizeState(state);
  return [
    {
      id: 'first-check-in', title: 'The first page',
      description: 'Log your first finished chapter.',
      earned: BOOKS.some(book => current.progress[book.id] > 0),
      selfReported: true,
    },
    {
      id: 'first-local-post', title: 'A thought, saved',
      description: 'Save your first chapter reflection in this browser.',
      earned: current.posts.length > 0,
      selfReported: false,
    },
    ...BOOKS.map(book => ({
      id: `finished-${book.id}`, bookId: book.id,
      title: 'A story, finished', description: `Finish ${book.title}.`,
      earned: getReadingProgress(current, book.id).isComplete,
      selfReported: true,
    })),
  ];
}

function plusDays(date, days) {
  return new Date(new Date(`${date}T00:00:00.000Z`).getTime() + days * DAY_MS).toISOString().split('T')[0];
}

/** A weekly plan; dates are UTC calendar dates, avoiding local DST shifts. */
export function getReadingSchedule(state) {
  const membership = normalizeMembership(state?.activeCircle);
  if (!membership) return [];
  const book = getBook(membership.bookId);
  const weeks = Math.ceil(book.chapterCount / membership.pace);
  return Array.from({ length: weeks }, (_, index) => {
    const fromChapter = index * membership.pace + 1;
    const toChapter = Math.min((index + 1) * membership.pace, book.chapterCount);
    const first = book.chapters[fromChapter - 1].label;
    const last = book.chapters[toChapter - 1].label;
    return {
      week: index + 1,
      startDate: plusDays(membership.startDate, index * 7),
      dueDate: plusDays(membership.startDate, index * 7 + 6),
      fromChapter, toChapter,
      label: fromChapter === toChapter ? first : `${first} – ${last}`,
    };
  });
}

function defaultStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

/** Storage is injectable for tests; unavailable/blocked/corrupt storage is harmless. */
export function loadState(storage = defaultStorage()) {
  try {
    if (!storage || typeof storage.getItem !== 'function') return createDefaultState();
    const raw = storage.getItem(STORAGE_KEY);
    if (typeof raw !== 'string' || raw.length > MAX_STORAGE_LENGTH) return createDefaultState();
    return normalizeState(JSON.parse(raw));
  } catch { return createDefaultState(); }
}

/** False means the UI should disclose that changes could not be persisted. */
export function saveState(state, storage = defaultStorage()) {
  try {
    if (!storage || typeof storage.setItem !== 'function') return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
    return true;
  } catch { return false; }
}
