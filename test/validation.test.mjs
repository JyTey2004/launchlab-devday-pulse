import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createObservationState, observationReducer, createObservationStore,
  summarize, canForwardHostedAction, isHostedWidgetMounted, initValidation,
} from '../src/validation.js';

const at = '2026-10-03T10:00:00.000Z';
const action = (name, extra = {}) => ({ type: 'track', name, at, ...extra });
const consent = { type: 'consent', allowed: true, at };
const response = { rating: 4, intent: 'yes', comment: 'The quick comparison was useful.' };
const initial = (saved) => createObservationState({ session: 'page_one', saved });

test('consent starts off on every visit and never records earlier actions retrospectively', () => {
  let state = initial({ consent: true, events: [{ name: 'experience_completed', session: 'previous_page', at }] });
  assert.equal(state.consent, false);
  assert.strictEqual(observationReducer(state, action('session_started')), state);
  state = observationReducer(state, consent);
  state = observationReducer(state, action('experience_completed'));
  state = observationReducer(state, { type: 'consent', allowed: false, at });
  assert.strictEqual(observationReducer(state, action('session_started')), state);
  state = observationReducer(state, consent);
  assert.deepEqual(summarize(state.events), {
    experience_completed: { occurrences: 2, sessions: 2 }, page_view: { occurrences: 1, sessions: 1 },
  });
  const nextVisit = createObservationState({ session: 'page_two', saved: state });
  assert.equal(nextVisit.consent, false);
  assert.equal(nextVisit.viewRecorded, false);
});

test('repeated completed actions count twice while one page session remains one session', () => {
  let state = observationReducer(initial(), consent);
  state = observationReducer(state, action('experience_completed', { personalInfo: 'should never be copied' }));
  state = observationReducer(state, action('experience_completed'));
  assert.deepEqual(summarize(state.events).experience_completed, { occurrences: 2, sessions: 1 });
  assert.deepEqual(Object.keys(state.events[1]), ['name', 'session', 'at']);
  assert.equal(JSON.stringify(state.events).includes('personalInfo'), false);
});

test('invalid events are rejected before state changes, counting or hosted forwarding', () => {
  const state = observationReducer(initial(), consent);
  for (const name of ['', 'a', 'Click Checkout', '<script>', '__proto__', 'A_bad', null, {}, 'a'.repeat(41)]) {
    assert.strictEqual(observationReducer(state, action(name)), state);
    assert.equal(canForwardHostedAction({ name, mounted: true, configured: true }), false);
  }
  assert.deepEqual(summarize([{ name: '__proto__', session: 'one' }, { name: 'experience_completed', session: null }]), {});
  assert.deepEqual(summarize([{ name: 'constructor', session: 'one' }]), { constructor: { occurrences: 1, sessions: 1 } });
});

test('feedback works with activity off and updates exactly one response for the page', () => {
  let state = initial();
  state = observationReducer(state, { type: 'feedback', at, response });
  state = observationReducer(state, { type: 'feedback', at, response: { ...response, rating: 2, comment: 'I would change the choices.', session: 'spoofed_session', email: 'discard this' } });
  assert.equal(state.consent, false);
  assert.equal(state.events.length, 0);
  assert.equal(state.feedback.length, 1);
  assert.equal(state.feedback[0].session, 'page_one');
  assert.equal(state.feedback[0].rating, 2);
  assert.equal(Object.hasOwn(state.feedback[0], 'email'), false);
  for (const invalid of [{ ...response, rating: 6 }, { ...response, intent: 'pay' }, { ...response, comment: 'bad' }, { ...response, comment: 'a'.repeat(601) }]) {
    assert.strictEqual(observationReducer(state, { type: 'feedback', at, response: invalid }), state);
  }
});

test('failed browser writes retain feedback in memory, including subsequent updates', () => {
  const store = createObservationStore({ session: 'page_one', key: 'local', storage: { setItem() { throw new Error('quota exceeded'); } } });
  const saved = store.dispatch({ type: 'feedback', at, response });
  assert.equal(saved.changed, true);
  assert.equal(saved.persisted, false);
  const updated = store.dispatch({ type: 'feedback', at, response: { ...response, comment: 'This is my updated feedback.' } });
  assert.equal(updated.state.feedback.length, 1);
  assert.equal(store.getState().feedback[0].comment, 'This is my updated feedback.');
  assert.equal(store.dispatch({ type: 'clear' }).state.feedback.length, 0);
});

test('stored data is bounded, malformed entries are discarded, and extra form fields do not survive', () => {
  const events = Array.from({ length: 410 }, (_, i) => ({ name: 'experience_completed', session: `page_${i}`, at, brief: 'private form text' }));
  const saved = {
    events: [...events, { name: '<bad>', session: 'last', at }, { name: 'experience_completed', session: 'last', at: 'bad timestamp' }],
    feedback: [
      { ...response, session: 'prior', at },
      { ...response, session: 'prior', at, rating: 5, email: 'discard' },
      { ...response, session: 'invalid space', at },
    ],
  };
  const state = initial(saved);
  assert.equal(state.events.length, 400);
  assert.equal(state.events[0].session, 'page_10');
  assert.equal(JSON.stringify(state.events).includes('private form text'), false);
  assert.equal(state.feedback.length, 1);
  assert.equal(state.feedback[0].rating, 5);
  assert.equal(Object.hasOwn(state.feedback[0], 'email'), false);
  assert.deepEqual(initial({ events: {}, feedback: null }).events, []);
});

test('a real mounted widget yields local control, while an SDK stub alone does not', () => {
  const stubDocument = { getElementById: () => null };
  const hostWithoutLauncher = { getElementById: () => ({ shadowRoot: { querySelector: () => null } }) };
  const realMountedDocument = { getElementById: (id) => id === '__launchlab' ? { shadowRoot: { querySelector: (selector) => selector === '.launcher' ? {} : null } } : null };
  assert.equal(isHostedWidgetMounted(stubDocument), false);
  assert.equal(isHostedWidgetMounted(hostWithoutLauncher), false);
  assert.equal(isHostedWidgetMounted(realMountedDocument), true);
  let state = observationReducer(initial(), consent);
  state = observationReducer(state, { type: 'hosted', mounted: true });
  assert.equal(state.consent, false);
  assert.strictEqual(observationReducer(state, consent), state);
  assert.strictEqual(observationReducer(state, action('experience_completed')), state);
  assert.strictEqual(observationReducer(state, { type: 'feedback', at, response }), state);
  state = observationReducer(state, { type: 'hosted', mounted: false });
  assert.equal(state.consent, false);
  assert.equal(observationReducer(state, { type: 'feedback', at, response }).feedback.length, 1);
});

test('only explicit validated completions forward; intent markers are left to the hosted collector', () => {
  const config = { name: 'experience_completed', mounted: true, configured: true };
  assert.equal(canForwardHostedAction(config), true);
  assert.equal(canForwardHostedAction({ ...config, source: 'intent' }), false);
  assert.equal(canForwardHostedAction({ ...config, mounted: false }), false);
  assert.equal(canForwardHostedAction({ ...config, configured: false }), false);
  assert.equal(canForwardHostedAction({ ...config, configured: 'true' }), false);
});

test('clear resets consent and observations while allowing a new explicit recording session', () => {
  let state = observationReducer(initial(), consent);
  state = observationReducer(state, action('experience_completed'));
  state = observationReducer(state, { type: 'feedback', at, response });
  state = observationReducer(state, { type: 'clear' });
  assert.equal(state.consent, false);
  assert.equal(state.viewRecorded, false);
  assert.deepEqual(state.events, []);
  assert.deepEqual(state.feedback, []);
  assert.strictEqual(observationReducer(state, action('experience_completed')), state);
  state = observationReducer(state, consent);
  assert.deepEqual(summarize(state.events), { page_view: { occurrences: 1, sessions: 1 } });
});

test('browser adapter handles late widget mount without losing local feedback or forwarding intent twice', () => {
  // A small browser contract fixture keeps this test independent of DOM libraries.
  const names = ['document', 'localStorage', 'LaunchLab', 'MutationObserver', 'FormData', 'setInterval', 'clearInterval', 'addEventListener'];
  const originals = new Map(names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, {
      hidden: false, textContent: '', listeners: new Map(), values: {},
      addEventListener(type, handler) { this.listeners.set(type, handler); },
      fire(type) { this.listeners.get(type)?.({ currentTarget: this, preventDefault() {} }); },
    });
    return nodes.get(id);
  };
  const root = { classList: { add() {} }, innerHTML: '', querySelector: (selector) => node(selector.slice(1)) };
  const documentListeners = new Map();
  let host;
  let observer;
  let intervalCallback;
  const forwarded = [];
  try {
    globalThis.document = {
      body: {},
      getElementById: (id) => id === 'validation-root' ? root : id === '__launchlab' ? host : null,
      addEventListener: (type, handler) => documentListeners.set(type, handler),
      removeEventListener: (type) => documentListeners.delete(type),
    };
    globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    globalThis.LaunchLab = { state: () => ({ configured: true }), track: (name) => forwarded.push(name) };
    globalThis.MutationObserver = class { constructor(callback) { this.callback = callback; observer = this; } observe() {} disconnect() {} };
    globalThis.FormData = class { constructor(form) { this.values = form.values; } get(name) { return this.values[name]; } };
    globalThis.setInterval = (callback) => { intervalCallback = callback; return 1; };
    globalThis.clearInterval = () => {};
    globalThis.addEventListener = () => {};
    const adapter = initValidation({ project: 'devday-pulse', goalEvent: 'experience_completed', labels: { experience_completed: '<img onerror=bad>' } });
    assert.equal(node('local-feedback').hidden, false, 'A fake SDK must not hide local feedback');
    adapter.track('experience_completed');
    assert.equal(forwarded.length, 0);
    assert.equal(node('local-events').textContent, 'No locally recorded actions.');
    node('allow-activity').fire('click');
    adapter.track('experience_completed');
    adapter.track('experience_completed');
    assert.match(node('local-events').textContent, /<img onerror=bad>: 2 actions · 1 page sessions/);
    assert.equal(forwarded.length, 0);
    const form = node('local-feedback');
    form.values = { rating: '5', intent: 'yes', comment: 'The choices helped me make a decision.' };
    form.fire('submit');
    assert.match(node('feedback-status').textContent, /for this page only/);
    form.values.comment = 'I changed my mind after another try.';
    form.fire('submit');
    assert.match(node('feedback-status').textContent, /updated.*not counted twice/);
    host = { shadowRoot: { querySelector: () => null } };
    observer.callback();
    assert.equal(form.hidden, false);
    host.shadowRoot.querySelector = () => ({});
    intervalCallback(); // Shadow-only readiness must be noticed even without a light-DOM mutation.
    assert.equal(form.hidden, true);
    assert.equal(node('local-consent-controls').hidden, true);
    adapter.track('experience_completed');
    documentListeners.get('click')({ target: { closest: () => ({ dataset: { launchlabEvent: 'experience_requested' } }) } });
    adapter.track('<bad>');
    assert.deepEqual(forwarded, ['experience_completed']);
    assert.match(node('local-events').textContent, /2 actions/);
    host = undefined;
    observer.callback();
    assert.equal(form.hidden, false);
    assert.match(node('consent-label').textContent, /recording is off/);
    adapter.track('experience_completed');
    assert.match(node('local-events').textContent, /2 actions/);
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});
