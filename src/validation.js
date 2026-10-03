const EVENT_NAME = /^[a-z][a-z0-9_]{2,39}$/;
const SESSION = /^[A-Za-z0-9_-]{1,100}$/;
const EVENT_LIMIT = 400;
const FEEDBACK_LIMIT = 50;

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

export function isValidEventName(name) {
  return typeof name === 'string' && EVENT_NAME.test(name);
}

const validSession = (session) => typeof session === 'string' && SESSION.test(session);
const validTime = (at) => typeof at === 'string' && at.length <= 40 && Number.isFinite(Date.parse(at));

function cleanEvent(event) {
  if (!event || !isValidEventName(event.name) || !validSession(event.session) || !validTime(event.at)) return null;
  // Never preserve arbitrary fields or form contents in activity observations.
  return { name: event.name, session: event.session, at: event.at };
}

function cleanFeedback(feedback) {
  if (!feedback || !validSession(feedback.session) || !validTime(feedback.at)) return null;
  if (!Number.isInteger(feedback.rating) || feedback.rating < 1 || feedback.rating > 5) return null;
  if (!['yes', 'maybe', 'no'].includes(feedback.intent)) return null;
  if (typeof feedback.comment !== 'string') return null;
  const comment = feedback.comment.trim();
  if (comment.length < 5 || comment.length > 600) return null;
  return { session: feedback.session, rating: feedback.rating, intent: feedback.intent, comment, at: feedback.at };
}

export function summarize(events = []) {
  const result = {};
  const sessions = new Map();
  for (const event of Array.isArray(events) ? events : []) {
    if (!event || !isValidEventName(event.name) || !validSession(event.session)) continue;
    if (!Object.hasOwn(result, event.name)) result[event.name] = { occurrences: 0, sessions: 0 };
    if (!sessions.has(event.name)) sessions.set(event.name, new Set());
    result[event.name].occurrences += 1;
    sessions.get(event.name).add(event.session);
    result[event.name].sessions = sessions.get(event.name).size;
  }
  return result;
}

export function createObservationState({ session, saved = {} }) {
  if (!validSession(session)) throw new TypeError('A valid page session is required.');
  const events = (Array.isArray(saved?.events) ? saved.events : []).map(cleanEvent).filter(Boolean).slice(-EVENT_LIMIT);
  const responses = new Map();
  for (const candidate of Array.isArray(saved?.feedback) ? saved.feedback : []) {
    const response = cleanFeedback(candidate);
    if (response) responses.set(response.session, response);
  }
  return {
    session, consent: false, hosted: false, viewRecorded: false,
    events, feedback: [...responses.values()].slice(-FEEDBACK_LIMIT),
  };
}

/** A page session is a browser visit, never a count of unique people. */
export function observationReducer(state, action) {
  if (!action || typeof action !== 'object') return state;
  if (action.type === 'hosted') {
    const hosted = action.mounted === true;
    if (state.hosted === hosted) return state;
    return { ...state, hosted, consent: false };
  }
  if (action.type === 'consent') {
    if (state.hosted) return state;
    const consent = action.allowed === true;
    if (consent && !state.viewRecorded && validTime(action.at)) {
      return {
        ...state, consent, viewRecorded: true,
        events: [...state.events, { name: 'page_view', session: state.session, at: action.at }].slice(-EVENT_LIMIT),
      };
    }
    return { ...state, consent };
  }
  if (action.type === 'track') {
    // Validate before any counting or state change. Extra supplied fields are ignored.
    if (!isValidEventName(action.name) || !validTime(action.at) || !state.consent || state.hosted) return state;
    return {
      ...state,
      events: [...state.events, { name: action.name, session: state.session, at: action.at }].slice(-EVENT_LIMIT),
    };
  }
  if (action.type === 'feedback') {
    if (state.hosted) return state;
    const response = cleanFeedback({ ...action.response, session: state.session, at: action.at });
    if (!response) return state;
    const feedback = state.feedback.filter((item) => item.session !== state.session);
    feedback.push(response);
    return { ...state, feedback: feedback.slice(-FEEDBACK_LIMIT) };
  }
  if (action.type === 'clear') {
    return { ...state, consent: false, viewRecorded: false, events: [], feedback: [] };
  }
  return state;
}

/** Storage failure retains this page's state; a failed write must never discard feedback. */
export function createObservationStore({ session, saved, storage, key }) {
  let state = createObservationState({ session, saved });
  return {
    getState: () => state,
    dispatch(action) {
      const previous = state;
      state = observationReducer(state, action);
      let persisted = false;
      if (state !== previous) {
        try {
          storage?.setItem(key, JSON.stringify({ events: state.events, feedback: state.feedback }));
          persisted = Boolean(storage);
        } catch { /* Continue in page memory when browser storage is unavailable or full. */ }
      }
      return { state, changed: state !== previous, persisted };
    },
  };
}

export function isHostedWidgetMounted(documentLike) {
  try {
    return Boolean(documentLike?.getElementById('__launchlab')?.shadowRoot?.querySelector('.launcher'));
  } catch { return false; }
}

export function canForwardHostedAction({ name, source = 'explicit', mounted, configured }) {
  return isValidEventName(name) && source === 'explicit' && mounted === true && configured === true;
}

export function downloadJson(value, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function initValidation({ project, goalEvent, labels = {} }) {
  const root = document.getElementById('validation-root');
  if (!root) return { track: () => false };
  const key = `launchlab-demo:${project}:v1`;
  const session = globalThis.crypto?.randomUUID?.() ?? `page_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  let storage;
  let saved;
  try { storage = globalThis.localStorage; saved = JSON.parse(storage.getItem(key) || '{}'); } catch { /* Memory only. */ }
  const store = createObservationStore({ session, saved, storage, key });
  const now = () => new Date().toISOString();
  root.classList.add('validation-shell');
  root.innerHTML = `
    <div class="validation-feedback">
      <div class="validation-heading"><p class="eyebrow">Help shape the experience</p><h3>One minute. One useful signal.</h3></div>
      <p class="validation-hint" id="local-feedback-hint">Feedback stays in this browser. Leave out names, contact details and other personal information.</p>
      <form id="local-feedback" class="validation-feedback-form">
        <div class="validation-form-row">
          <label>How easy was it?<select name="rating"><option value="5">5 — Very easy</option><option value="4">4 — Easy</option><option value="3">3 — Okay</option><option value="2">2 — Difficult</option><option value="1">1 — Very difficult</option></select></label>
          <label>Would you use this again?<select name="intent"><option value="yes">Yes</option><option value="maybe">Maybe</option><option value="no">No</option></select></label>
        </div>
        <label>What would make this useful to you?<textarea name="comment" minlength="5" maxlength="600" rows="2" required placeholder="A useful moment, or something you would change…"></textarea></label>
        <button type="submit" class="button secondary">Save feedback locally</button>
        <p id="feedback-status" class="validation-status" role="status"></p>
      </form>
      <p id="hosted-feedback" class="validation-hint" hidden>Use the LaunchLab “Share feedback” widget to send feedback to the founder.</p>
    </div>
    <details class="validation-controls">
      <summary>Local data controls</summary>
      <p class="validation-hint">Optional activity observations are local to this browser. They are rehearsal data, not customer traction. Form contents are never added to activity observations.</p>
      <p id="consent-label" class="validation-status">Local activity recording is off.</p>
      <div class="validation-actions" id="local-consent-controls"><button id="allow-activity" class="button secondary" type="button">Allow local recording</button><button id="decline-activity" class="button ghost" type="button">Keep recording off</button></div>
      <p id="local-events" class="validation-counts"></p>
      <p class="validation-hint">Sessions count page visits, not unique people.</p>
      <div class="validation-actions"><button id="export-observations" class="button secondary" type="button">Download local data</button><button id="clear-observations" class="button ghost" type="button">Clear local data</button></div>
      <p id="observations-status" class="validation-status" role="status"></p>
    </details>`;
  const get = (id) => root.querySelector(`#${id}`);

  function renderCounts() {
    const totals = summarize(store.getState().events);
    get('local-events').textContent = Object.entries(totals).map(([name, count]) => {
      const label = Object.hasOwn(labels, name) ? String(labels[name]) : name;
      return `${label}: ${count.occurrences} actions · ${count.sessions} page sessions`;
    }).join('\n') || 'No locally recorded actions.';
  }

  function renderMode() {
    const { hosted, consent } = store.getState();
    get('local-feedback').hidden = hosted;
    get('local-feedback-hint').hidden = hosted;
    get('hosted-feedback').hidden = !hosted;
    get('local-consent-controls').hidden = hosted;
    get('consent-label').textContent = hosted
      ? 'Shared recording is managed by the LaunchLab widget. Open Tracking preferences to review consent.'
      : consent ? 'Local activity recording is on for this page visit.' : 'Local activity recording is off. Feedback still works.';
  }

  function syncHosted() {
    const { changed } = store.dispatch({ type: 'hosted', mounted: isHostedWidgetMounted(document) });
    if (changed) renderMode();
    return store.getState().hosted;
  }

  function record(name, source) {
    if (!isValidEventName(name)) return false;
    const mounted = syncHosted();
    let configured = false;
    try { configured = globalThis.LaunchLab?.state?.().configured === true; } catch { /* Local experience remains usable. */ }
    if (canForwardHostedAction({ name, source, mounted, configured })) {
      try { globalThis.LaunchLab?.track?.(name); } catch { /* SDK owns hosted delivery and recovery. */ }
    }
    const { changed } = store.dispatch({ type: 'track', name, at: now() });
    if (changed) renderCounts();
    return changed || canForwardHostedAction({ name, source, mounted, configured });
  }

  get('allow-activity').addEventListener('click', () => {
    if (syncHosted()) return;
    store.dispatch({ type: 'consent', allowed: true, at: now() });
    renderMode(); renderCounts();
  });
  get('decline-activity').addEventListener('click', () => {
    if (syncHosted()) return;
    store.dispatch({ type: 'consent', allowed: false, at: now() });
    renderMode();
  });
  get('export-observations').addEventListener('click', () => {
    const { events, feedback } = store.getState();
    downloadJson({
      project, mode: 'local-rehearsal', goalEvent, exportedAt: now(),
      counts: summarize(events), events, feedback,
      limitations: 'Browser page sessions are not unique people. This file is local rehearsal data, not shared validation results.',
    }, `${String(project).replace(/[^a-zA-Z0-9_-]/g, '-')}-local-observations.json`);
  });
  get('clear-observations').addEventListener('click', () => {
    const { persisted } = store.dispatch({ type: 'clear' });
    renderMode(); renderCounts();
    get('feedback-status').textContent = '';
    get('observations-status').textContent = persisted
      ? 'Local data cleared. Recording is off. Your experience selections are unchanged.'
      : 'This page’s data is cleared. Browser storage could not be updated; older saved data may remain.';
  });
  get('local-feedback').addEventListener('submit', (event) => {
    event.preventDefault();
    if (syncHosted()) return;
    const form = new FormData(event.currentTarget);
    const wasSaved = store.getState().feedback.some((item) => item.session === session);
    const { changed, persisted } = store.dispatch({
      type: 'feedback', at: now(),
      response: { rating: Number(form.get('rating')), intent: String(form.get('intent')), comment: String(form.get('comment') || '') },
    });
    get('feedback-status').textContent = !changed
      ? 'Please give a valid rating, use intent and 5–600 characters of feedback.'
      : wasSaved
        ? `Your feedback was updated ${persisted ? 'in this browser' : 'for this page only'}; it was not counted twice.`
        : `Feedback saved ${persisted ? 'in this browser' : 'for this page only; browser storage is unavailable'}.`;
  });
  const onMarkerClick = (event) => {
    const element = event.target?.closest?.('[data-launchlab-event]');
    if (element) record(element.dataset.launchlabEvent, 'intent');
  };
  document.addEventListener('click', onMarkerClick);
  renderCounts(); renderMode(); syncHosted();
  const observer = new MutationObserver(syncHosted);
  observer.observe(document.body, { childList: true, subtree: true });
  // Shadow-root creation is not visible to a light-DOM observer. Recheck for late widget mounts.
  const interval = setInterval(syncHosted, 1000);
  globalThis.addEventListener('pagehide', () => {
    observer.disconnect(); clearInterval(interval); document.removeEventListener('click', onMarkerClick);
  }, { once: true });
  return { track: (name) => record(name, 'explicit') };
}
