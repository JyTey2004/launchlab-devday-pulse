export const JOBS = Object.freeze([
  { id: 'launch', label: 'Launch an experiment', caption: 'From a repository to a useful signal.', icon: 'launch', tag: 'Build → validate' },
  { id: 'protocol', label: 'Navigate a new protocol', caption: 'Understand the next step before acting.', icon: 'route', tag: 'Discover → understand' },
  { id: 'data', label: 'Find trustworthy data', caption: 'Know where an answer came from.', icon: 'layers', tag: 'Evidence → confidence' },
  { id: 'coordination', label: 'Coordinate paid work', caption: 'Turn a request into a clear handoff.', icon: 'handoff', tag: 'Request → outcome' },
]);

export const AUDIENCES = Object.freeze([
  { id: 'founder', label: 'Founder', context: 'An early-stage founder trying to test a product assumption' },
  { id: 'developer', label: 'Developer', context: 'A developer building an agent or Web3 application' },
  { id: 'community', label: 'Community', context: 'A community member evaluating a useful new service' },
]);

export const PRICE_SIGNALS = Object.freeze([
  { id: 'free', label: 'Free', amount: 0 },
  { id: 'one', label: '$1', amount: 1 },
  { id: 'five', label: '$5', amount: 5 },
  { id: 'ten', label: '$10', amount: 10 },
]);

const TEMPLATES = Object.freeze({
  launch: {
    title: 'The experiment launchpad',
    proposition: 'An agent that takes a small public repository from build readiness to a measurable product experiment.',
    hypothesis: 'Builders will finish one meaningful test sooner when deployment, consent-based tracking and feedback share one workflow.',
    workflow: ['Inspect the public repository and identify its framework.', 'Show the build plan, estimated costs and approval boundary.', 'After approval, deploy a preview and add consent-based measurement.', 'Return a preview link and a report that separates rehearsals from real usage.'],
    successAction: 'A visitor completes the core experience and submits one useful piece of feedback.',
    privacyBoundary: 'Keep credentials and private source out of the brief. Collect only consented, named events; report access stays private.',
    question: 'Can someone complete the core experience without help?',
  },
  protocol: {
    title: 'The protocol pathfinder',
    proposition: 'An agent that turns an unfamiliar protocol into a clear, source-backed next-step guide.',
    hypothesis: 'People will understand a protocol faster when a guide explains its prerequisites, risks and approval steps in context.',
    workflow: ['Identify the protocol and the user’s intended outcome.', 'Find the official documentation and supported tool interface.', 'Explain prerequisites and build a read-only walkthrough.', 'Ask for separate approval before any future signing or transaction.'],
    successAction: 'A visitor identifies the correct next step in a short protocol scenario.',
    privacyBoundary: 'Never request seed phrases or private keys. This experiment produces guidance and does not sign transactions.',
    question: 'Can someone identify the next step and the approval boundary?',
  },
  data: {
    title: 'The evidence concierge',
    proposition: 'An agent that returns a useful answer with its sources, freshness and unresolved gaps.',
    hypothesis: 'Builders will prefer a concise answer with traceable sources over an answer whose origin is unclear.',
    workflow: ['Ask for the decision the answer should inform.', 'Collect a small set of relevant primary sources.', 'Show evidence, timestamps and disagreement between sources.', 'Let the user flag missing evidence or an unhelpful answer.'],
    successAction: 'A visitor opens a supporting source and rates whether it helped their decision.',
    privacyBoundary: 'Use public sources in the experiment. Do not upload personal or confidential records; avoid investment recommendations.',
    question: 'Does visible source evidence help someone make their next decision?',
  },
  coordination: {
    title: 'The outcome coordinator',
    proposition: 'An agent that turns a loose service request into a clear scope, acceptance check and deliverable.',
    hypothesis: 'Buyers and providers will need fewer clarification steps when they agree on the outcome before work begins.',
    workflow: ['Convert the request into a bounded scope and deliverable.', 'Show the service, terms and approval checkpoints.', 'Let buyer and provider confirm the proposed handoff.', 'Return a deliverable for review; require a separate payment approval.'],
    successAction: 'A visitor reviews a sample deliverable and identifies whether it meets the agreed scope.',
    privacyBoundary: 'Use a fictional handoff for the experiment. This app does not create marketplace tasks, escrow funds or pay anyone.',
    question: 'Can someone tell whether a deliverable satisfies the agreed outcome?',
  },
});

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function createExperiment({ jobId, audienceId, friction = '' } = {}) {
  const job = JOBS.find((entry) => entry.id === jobId);
  const audience = AUDIENCES.find((entry) => entry.id === audienceId);
  if (!job) throw new TypeError('Choose one of the four supported agent jobs.');
  if (!audience) throw new TypeError('Choose a supported audience.');
  if (typeof friction !== 'string' || friction.length > 180) throw new TypeError('Friction must be text with at most 180 characters.');
  const template = TEMPLATES[job.id];
  return {
    schemaVersion: 1,
    generation: 'deterministic-template',
    jobId: job.id,
    job: job.label,
    audienceId: audience.id,
    audience: audience.label,
    audienceContext: audience.context,
    friction: friction.trim(),
    title: template.title,
    proposition: template.proposition,
    hypothesis: template.hypothesis,
    workflow: [...template.workflow],
    successAction: template.successAction,
    privacyBoundary: template.privacyBoundary,
    question: template.question,
  };
}

export function validatePriceSignal(value) {
  const result = PRICE_SIGNALS.find((entry) => entry.id === value);
  if (!result) throw new TypeError('Choose a supported nonbinding price signal.');
  return { ...result, currency: 'USD', nonbinding: true };
}

export function buildExperimentBrief(card, priceSignal = null) {
  // Revalidate public inputs rather than trusting an edited/exported card.
  const current = createExperiment({ jobId: card?.jobId, audienceId: card?.audienceId, friction: card?.friction });
  const signal = priceSignal === null ? null : validatePriceSignal(typeof priceSignal === 'string' ? priceSignal : priceSignal?.id);
  return [
    `Product experiment: ${current.title}`,
    `Audience: ${current.audienceContext}.`,
    `Problem: ${current.job}.`,
    current.friction ? `Attendee-reported friction (unverified): ${current.friction}` : 'Attendee-reported friction: not provided.',
    '',
    `Service concept: ${current.proposition}`,
    `Hypothesis to test: ${current.hypothesis}`,
    `Validation question: ${current.question}`,
    `Success action: ${current.successAction}`,
    '',
    'Proposed workflow:',
    ...current.workflow.map((step, index) => `${index + 1}. ${step}`),
    '',
    `Privacy boundary: ${current.privacyBoundary}`,
    signal ? `Personal price signal: ${signal.label} USD per outcome; nonbinding research, not a purchase or a LaunchLab price.` : 'Personal price signal: not provided.',
    '',
    'Generated by Dev Day Pulse using a fixed template, without an LLM. This is one person’s draft experiment, not validated market demand.',
    'If using LaunchLab: ask for repository inspection and a costed plan first. Do not create a paid task, call a model or deploy until the owner approves the actual terms. Any preview expiry needs a confirmed retirement plan.',
  ].join('\n');
}
