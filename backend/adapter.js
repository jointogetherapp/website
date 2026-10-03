/** Optional live adapter. Disabled by default. Memory-only sessions; no service keys. */
export function createTogetherClient({ url = '', publishableKey = '', enabled = false, fetchImpl = globalThis.fetch } = {}) {
  let token = null;
  let expiresAt = 0;
  const ready = enabled === true && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && /^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey);
  // Explicitly refuse the unrelated Buttonwood project even if configured accidentally.
  const isolated = !url.includes('nxfsuntmtmdawacxssas');
  function requireConfig() {
    if (!ready || !isolated) throw new Error('Together live backend is not configured. This preview does not create real memberships.');
  }
  async function request(path, { method = 'GET', body, authenticated = true, auth = false } = {}) {
    requireConfig();
    if (authenticated && (!token || Date.now() >= expiresAt)) {
      token = null;
      throw new Error('Please sign in to continue.');
    }
    const headers = { apikey: publishableKey, 'Content-Type': 'application/json' };
    if (authenticated) headers.Authorization = `Bearer ${token}`;
    if (!auth) { headers['Accept-Profile'] = 'together'; headers['Content-Profile'] = 'together'; }
    const response = await fetchImpl(url + path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      if (response.status === 401) { token = null; expiresAt = 0; }
      const error = new Error(auth ? 'Authentication could not be completed. Check your details or confirm your email.' : (result?.message || 'The request could not be completed.'));
      error.status = response.status;
      throw error;
    }
    return result;
  }
  const command = (action, payload = {}) => request('/rest/v1/rpc/command', { method: 'POST', body: { action, payload } });
  const id = value => {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) throw new Error('Invalid identifier.');
    return value;
  };
  return Object.freeze({
    configured: ready && isolated,
    async signIn(email, password) {
      token = null; expiresAt = 0;
      const session = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password }, authenticated: false, auth: true });
      token = session.access_token;
      expiresAt = Date.now() + Number(session.expires_in || 0) * 1000;
      return { user: session.user, expiresAt };
    },
    async signUp(email, password) {
      // Does not treat sign-up as a signed-in session, including projects without confirmation.
      await request('/auth/v1/signup', { method: 'POST', body: { email, password }, authenticated: false, auth: true });
      return { requiresSignIn: true, message: 'Check your email for confirmation, then sign in.' };
    },
    async signOut() {
      try { if (token) await request('/auth/v1/logout', { method: 'POST', auth: true }); }
      finally { token = null; expiresAt = 0; }
    },
    listBooks: () => request('/rest/v1/books?select=id,title,author,chapters,description&published=eq.true&limit=100', { authenticated: false }),
    listCircles: () => request('/rest/v1/circles?select=id,book_id,name,mode,city,public_venue,capacity,status,starts_at&status=eq.open&limit=100', { authenticated: false }),
    listMemberships: () => request('/rest/v1/memberships?select=circle_id,user_id,joined_at&limit=100'),
    listProfiles: () => request('/rest/v1/profiles?select=id,pseudonym&limit=100'),
    listPosts: circleId => request(`/rest/v1/posts?circle_id=eq.${id(circleId)}&select=id,circle_id,author_id,chapter,body,created_at&order=created_at.desc&limit=100`),
    listProgress: () => request('/rest/v1/progress?select=circle_id,chapter,updated_at&limit=100'),
    listBadges: () => request('/rest/v1/badges?select=code,awarded_at&limit=100'),
    saveProfile: pseudonym => command('save_profile', { pseudonym }),
    joinCircle: circleId => command('join', { circle_id: id(circleId) }),
    leaveCircle: circleId => command('leave', { circle_id: id(circleId) }),
    createPost: (circleId, chapter, body) => command('post', { circle_id: id(circleId), chapter, body }),
    saveProgress: (circleId, chapter) => command('progress', { circle_id: id(circleId), chapter }),
    reportPost: (postId, reason) => command('report', { post_id: id(postId), reason }),
    blockMember: userId => command('block', { user_id: id(userId) }),
    voteNextBook: (circleId, bookId) => command('vote', { circle_id: id(circleId), book_id: id(bookId) }),
    getEntitlement: () => command('entitlement'),
    createCircle: ({ bookId, name, mode, city, publicVenue }) => command('create_circle', { book_id: id(bookId), name, mode, city, public_venue: publicVenue })
  });
}
