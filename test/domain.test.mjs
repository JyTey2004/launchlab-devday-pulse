import test from 'node:test';
import assert from 'node:assert/strict';
import { JOBS, AUDIENCES, PRICE_SIGNALS, createExperiment, validatePriceSignal, buildExperimentBrief, escapeHtml } from '../src/domain.js';

test('every supported job and audience produces a bounded actionable experiment', () => {
  for (const job of JOBS) for (const audience of AUDIENCES) {
    const card = createExperiment({ jobId: job.id, audienceId: audience.id });
    assert.equal(card.generation, 'deterministic-template');
    assert.equal(card.audience, audience.label);
    assert.equal(card.workflow.length, 4);
    assert.ok(card.question.endsWith('?'));
    assert.ok(card.successAction.length > 30);
    assert.ok(card.privacyBoundary.length > 30);
  }
});

test('invalid jobs and audiences fail rather than silently invent a service', () => {
  for (const input of [{}, { jobId: 'unsupported', audienceId: 'founder' }, { jobId: 'data', audienceId: 'investor' }, { jobId: 'data', audienceId: null }]) {
    assert.throws(() => createExperiment(input), TypeError);
  }
});

test('friction has a strict type and 180 character boundary', () => {
  const input = { jobId: 'launch', audienceId: 'founder' };
  assert.equal(createExperiment({ ...input, friction: 'x'.repeat(180) }).friction.length, 180);
  assert.throws(() => createExperiment({ ...input, friction: 'x'.repeat(181) }), TypeError);
  assert.throws(() => createExperiment({ ...input, friction: { text: 'something' } }), TypeError);
  assert.equal(createExperiment({ ...input, friction: '  Hard to start  ' }).friction, 'Hard to start');
});

test('all price signals are explicitly nonbinding and reject arbitrary amounts', () => {
  for (const signal of PRICE_SIGNALS) {
    assert.deepEqual(validatePriceSignal(signal.id), { ...signal, currency: 'USD', nonbinding: true });
  }
  for (const value of ['100', 5, {}, null, '']) assert.throws(() => validatePriceSignal(value), TypeError);
});

test('user text is escaped at markup boundaries and does not change generated claims', () => {
  const text = '<img src=x onerror="alert(1)"> AI guaranteed 100% profit';
  const card = createExperiment({ jobId: 'data', audienceId: 'community', friction: text });
  assert.equal(card.friction, text);
  assert.ok(!escapeHtml(card.friction).includes('<img'));
  assert.ok(escapeHtml(card.friction).includes('&lt;img'));
  assert.ok(!card.proposition.includes('guaranteed'));
  assert.ok(!card.hypothesis.includes('profit'));
  assert.ok(buildExperimentBrief(card).includes('Attendee-reported friction (unverified):'));
  assert.ok(buildExperimentBrief(card).includes('without an LLM'));
});

test('the brief regenerates trusted fields and distinguishes research from purchase', () => {
  const card = createExperiment({ jobId: 'coordination', audienceId: 'developer' });
  const brief = buildExperimentBrief({ ...card, proposition: 'Guaranteed financial returns' }, 'five');
  assert.ok(!brief.includes('Guaranteed financial returns'));
  assert.ok(brief.includes('$5 USD per outcome; nonbinding research'));
  assert.ok(brief.includes('does not create marketplace tasks'));
  assert.ok(brief.includes('not validated market demand'));
  assert.throws(() => buildExperimentBrief(card, 'arbitrary'), TypeError);
});

test('cards do not share mutable workflow arrays or preserve prior input', () => {
  const first = createExperiment({ jobId: 'launch', audienceId: 'founder', friction: 'Earlier idea' });
  first.workflow[0] = 'Changed';
  const second = createExperiment({ jobId: 'launch', audienceId: 'founder' });
  assert.notEqual(second.workflow[0], 'Changed');
  assert.equal(second.friction, '');
});
