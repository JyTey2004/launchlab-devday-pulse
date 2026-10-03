import './style.css';
import { JOBS, AUDIENCES, PRICE_SIGNALS, createExperiment, validatePriceSignal, buildExperimentBrief, escapeHtml } from './domain.js';
import { initValidation } from './validation.js';

const icons = {
  launch: '<path d="M14 4c3-1 6-1 6-1s0 3-1 6l-7 7-5-5 7-7Z"/><path d="m7 11-3 1-1 5 5-1m4 0-1 5 5-1 1-3M5 19l-2 2m13-13h.01"/>',
  route: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 6h7a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h7"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5"/>',
  handoff: '<path d="M3 8h15m-4-4 4 4-4 4M21 16H6m4-4-4 4 4 4"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5"/>',
};
const icon = (name, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
const rehearsal = new URLSearchParams(location.search).get('test') === '1';
const state = { stage: 1, jobId: '', audienceId: '', friction: '', card: null, priceId: null, revision: 0 };

document.querySelector('#app').innerHTML = `
  <a class="skip-link" href="#experience">Skip to the experience</a>
  <div class="ambient ambient-one" aria-hidden="true"></div><div class="ambient ambient-two" aria-hidden="true"></div>
  <header class="site-header wrap">
    <a class="brand" href="#" aria-label="Dev Day Pulse home"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span>DEV DAY <strong>PULSE</strong><small>AN EXPERIENCE BY LAUNCHLAB</small></span></a>
    <nav aria-label="Main"><a href="https://launchlab.stardive.xyz/" target="_blank" rel="noopener noreferrer">About LaunchLab <span aria-hidden="true">↗</span></a><a class="nav-pill" href="https://launchlab.stardive.xyz/journey/" target="_blank" rel="noopener noreferrer">See the journey ${icon('arrow')}</a></nav>
  </header>
  <main class="wrap">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-eyebrow"><span class="live-dot" aria-hidden="true"></span> ONE MINUTE. ONE USEFUL SIGNAL.</div>
      <h1 id="hero-title">What should agents<br><span>build next?</span></h1>
      <p>Choose a problem that matters to you. Leave with a concrete service experiment. Help us learn what is worth building.</p>
      <div class="hero-meta"><span>Singapore · 7 October 2026</span><span>Independent Dev Day demo</span>${rehearsal ? '<span class="rehearsal-badge">Controlled rehearsal</span>' : ''}</div>
    </section>
    <div class="experience-grid">
      <section id="experience" class="workspace" aria-label="Create your agent service experiment">
        <div class="stepper" aria-label="Experience progress"><div data-step="1"><span>01</span><strong>The problem</strong></div><i aria-hidden="true"></i><div data-step="2"><span>02</span><strong>The experiment</strong></div><i aria-hidden="true"></i><div data-step="3"><span>03</span><strong>Your next move</strong></div></div>
        <div id="stage-content"></div>
      </section>
      <aside class="side-rail">
        <div class="journey-visual" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="orbit-node node-top">IDEA</span><span class="orbit-node node-bottom">SIGNAL</span><div class="orbit-core">${icon('launch')}<span>LAUNCHLAB</span></div><span class="spark spark-one"></span><span class="spark spark-two"></span></div>
        <div class="rail-copy"><span class="eyebrow">LESS GUESSWORK. MORE LEARNING.</span><h2>Turn “what if”<br>into a real test.</h2><p>LaunchLab helps builders inspect a repository, approve a plan, launch a preview and collect feedback.</p><a class="text-link" href="https://launchlab.stardive.xyz/journey/" target="_blank" rel="noopener noreferrer">Explore the founder journey ${icon('arrow')}</a></div>
        <div class="privacy-note"><span class="tiny-lock" aria-hidden="true">◇</span><div><strong>You control the signal.</strong><p>Your draft stays in this page’s memory. No wallet, payment or AI model is used. Optional measurement and feedback are separate choices below.</p></div></div>
        <div id="validation-root" class="validation-root"></div>
      </aside>
    </div>
    <footer class="site-footer"><span>DEV DAY PULSE <span class="footer-divider">/</span> Built to learn, by LaunchLab.</span><p>Personal preferences are hypotheses, not proven demand. This is an independent attendee experience, not an official OKX event application.</p></footer>
  </main>
  <div id="notification" class="notification" role="status" aria-live="polite"></div>
`;

const validation = initValidation({ project: 'devday-pulse', goalEvent: 'brief_created', labels: { page_view: 'Page visits', mission_started: 'Experiment starts', problem_selected: 'Problems selected', brief_created: 'Experiment briefs created', price_signal_submitted: 'Price preferences submitted', brief_copied: 'Briefs copied', brief_exported: 'Briefs exported' } });
const track = (name) => validation.track(name);
const stageElement = document.querySelector('#stage-content');
let toastTimer;

function notify(message) {
  const element = document.querySelector('#notification');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('visible'), 4500);
}

function updateProgress() {
  document.querySelectorAll('[data-step]').forEach((element) => {
    const step = Number(element.dataset.step);
    element.classList.toggle('active', step === state.stage);
    element.classList.toggle('completed', step < state.stage);
    if (step === state.stage) element.setAttribute('aria-current', 'step');
    else element.removeAttribute('aria-current');
  });
}

function focusStage() {
  stageElement.querySelector('h2')?.focus({ preventScroll: true });
  // Keep progress and the new screen visible without overriding reduced-motion preferences.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.querySelector('#experience').getBoundingClientRect().top < -90) document.querySelector('#experience').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
}

function renderSelection() {
  stageElement.innerHTML = `
    <div class="screen-intro"><span class="eyebrow">START WITH THE JOB</span><h2 tabindex="-1">Pick a problem worth solving.</h2><p>Which job would you most want an agent to make easier?</p></div>
    <form id="mission-form" novalidate>
      <fieldset class="job-fieldset"><legend class="sr-only">Choose an agent job</legend><div class="mission-grid">${JOBS.map((job) => `
        <label class="mission-card"><input type="radio" name="job" value="${job.id}" ${state.jobId === job.id ? 'checked' : ''} required><span class="mission-content"><span class="mission-top">${icon(job.icon)}<span class="selection-circle" aria-hidden="true">${icon('check')}</span></span><strong>${job.label}</strong><span class="mission-caption">${job.caption}</span><span class="mission-tag">${job.tag}</span></span></label>`).join('')}</div></fieldset>
      <fieldset class="audience-fieldset"><legend>Who are you building for?</legend><div class="choice-row">${AUDIENCES.map((audience) => `<label class="choice-pill"><input type="radio" name="audience" value="${audience.id}" ${state.audienceId === audience.id ? 'checked' : ''} required><span>${audience.label}</span></label>`).join('')}</div></fieldset>
      <div class="friction-field"><label for="friction">What gets in the way? <span>Optional</span></label><textarea id="friction" name="friction" maxlength="180" rows="2" placeholder="E.g. I can build a prototype, but getting the first useful feedback takes too long.">${escapeHtml(state.friction)}</textarea><div class="field-help"><span>Keep names, credentials and private information out of your draft.</span><span id="character-count">${state.friction.length}/180</span></div></div>
      <p id="form-error" class="form-error" role="alert"></p>
      <div class="screen-actions"><span class="template-note"><span aria-hidden="true">✦</span> Fixed templates. No GPT calls.</span><button class="button button-primary" type="submit" data-launchlab-event="mission_started">Create my experiment ${icon('arrow')}</button></div>
    </form>`;
  const form = document.querySelector('#mission-form');
  form.querySelector('#friction').addEventListener('input', (event) => {
    state.friction = event.target.value;
    document.querySelector('#character-count').textContent = `${state.friction.length}/180`;
  });
  form.addEventListener('change', (event) => {
    if (event.target.name === 'job') state.jobId = event.target.value;
    if (event.target.name === 'audience') state.audienceId = event.target.value;
    document.querySelector('#form-error').textContent = '';
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = new FormData(form);
    try {
      state.card = createExperiment({ jobId: values.get('job'), audienceId: values.get('audience'), friction: values.get('friction') });
      state.jobId = state.card.jobId;
      state.audienceId = state.card.audienceId;
      state.friction = state.card.friction;
    } catch (error) {
      document.querySelector('#form-error').textContent = error.message;
      const missing = !values.get('job') ? '[name="job"]' : !values.get('audience') ? '[name="audience"]' : '#friction';
      form.querySelector(missing)?.focus();
      return;
    }
    state.revision += 1;
    state.priceId = null;
    track('problem_selected');
    track('brief_created');
    state.stage = 2;
    render();
    focusStage();
  });
}

function experimentCard(compact = false) {
  const card = state.card;
  return `<article class="experiment-card ${compact ? 'final-card' : ''}" aria-label="Your generated experiment">
    <div class="card-topline"><span class="concept-pill">${icon(JOBS.find((job) => job.id === card.jobId).icon)} SERVICE CONCEPT</span><span class="audience-tag">For ${{ founder: 'founders', developer: 'developers', community: 'community members' }[card.audienceId]}</span></div>
    <h3>${card.title}</h3><p class="proposition">${card.proposition}</p>
    ${card.friction ? `<div class="your-friction"><span>Your friction · unverified</span><p>“${escapeHtml(card.friction)}”</p></div>` : ''}
    <div class="hypothesis-box"><span class="eyebrow">THE ASSUMPTION TO TEST</span><p>${card.hypothesis}</p></div>
    <div class="success-line">${icon('check')}<div><strong>Watch for this outcome</strong><p>${card.successAction}</p></div></div>
    <details class="workflow-details"><summary>Proposed workflow & privacy boundary <span aria-hidden="true">+</span></summary><ol>${card.workflow.map((step) => `<li>${step}</li>`).join('')}</ol><div class="boundary"><strong>Privacy boundary</strong><p>${card.privacyBoundary}</p></div></details>
  </article>`;
}

function renderPrice() {
  stageElement.innerHTML = `
    <div class="screen-intro"><span class="eyebrow">A SMALL TEST. A CLEAR OUTCOME.</span><h2 tabindex="-1">Here’s your starting point.</h2><p>Built from your selections using a fixed template. Refine it with real users next.</p></div>
    ${experimentCard()}
    <form id="price-form" novalidate><fieldset class="price-fieldset"><legend>If this worked, what would feel fair?</legend><p>One successful outcome. Your personal, nonbinding USD price signal.</p><div class="price-grid">${PRICE_SIGNALS.map((price) => `<label class="price-option"><input type="radio" name="price" value="${price.id}" required><span><strong>${price.label}</strong><small>${price.amount === 0 ? 'I’d try it free' : 'per outcome'}</small></span></label>`).join('')}</div></fieldset><p class="price-disclaimer">Research only. No charge, checkout or wallet connection. These are not LaunchLab’s service prices.</p><p id="price-error" class="form-error" role="alert"></p><div class="screen-actions"><button class="button button-quiet" id="revise" type="button">← Change my problem</button><button class="button button-primary" type="submit">Save my preference ${icon('arrow')}</button></div><button class="skip-price" type="button" id="skip-price">Prefer not to answer · continue</button></form>`;
  document.querySelector('#revise').addEventListener('click', () => { state.stage = 1; render(); focusStage(); });
  document.querySelector('#price-form').addEventListener('submit', (event) => {
    event.preventDefault();
    try { state.priceId = validatePriceSignal(new FormData(event.target).get('price')).id; }
    catch (error) { document.querySelector('#price-error').textContent = error.message; event.target.querySelector('[name="price"]')?.focus(); return; }
    track('price_signal_submitted');
    state.stage = 3;
    render();
    focusStage();
  });
  document.querySelector('#skip-price').addEventListener('click', () => { state.priceId = null; state.stage = 3; render(); focusStage(); });
}

function renderFinal() {
  const price = state.priceId === null ? null : validatePriceSignal(state.priceId);
  stageElement.innerHTML = `
    <div class="screen-intro"><span class="eyebrow">YOUR NEXT MOVE</span><h2 tabindex="-1">An idea you can actually test.</h2><p>Take your experiment with you. Then find out whether the real world agrees.</p></div>
    <div class="completion-strip">${icon('check')}<span>Your experiment brief is ready.</span><span class="completion-tag">${price ? `${price.label} · nonbinding` : 'No price signal'}</span></div>
    ${experimentCard(true)}
    <div class="export-actions"><button class="button button-primary" id="copy-brief" type="button">${icon('copy')} Copy experiment brief</button><button class="button button-secondary" id="export-brief" type="button">${icon('download')} Export JSON</button></div>
    <p class="export-hint">Copy uses your clipboard. Export saves a file on your device. Both include any friction you entered.</p>
    <details id="manual-copy" class="manual-copy" hidden><summary>Copy the brief manually</summary><textarea readonly aria-label="Your experiment brief"></textarea></details>
    <div class="next-move"><span class="eyebrow">TAKE IT ONE STEP FURTHER</span><h3>Give the experiment a home.</h3><p>Explore how LaunchLab turns a public repository into a preview with measurement and feedback. Review the actual plan and costs before approving any work.</p><a class="button button-secondary" href="https://launchlab.stardive.xyz/journey/#try-flow" target="_blank" rel="noopener noreferrer">Try the LaunchLab journey ${icon('arrow')}</a></div>
    <div class="final-footnote"><span>A preference is a starting point, not proof of demand.</span><button id="start-again" class="text-button" type="button">Make another experiment ↗</button></div>`;
  document.querySelector('#copy-brief').addEventListener('click', async () => {
    const brief = buildExperimentBrief(state.card, state.priceId);
    const button = document.querySelector('#copy-brief');
    button.disabled = true;
    try {
      await navigator.clipboard.writeText(brief);
      track('brief_copied');
      notify('Experiment brief copied. Paste it into your notes or an agent.');
    } catch {
      const fallback = document.querySelector('#manual-copy');
      fallback.hidden = false;
      fallback.open = true;
      const textarea = fallback.querySelector('textarea');
      textarea.value = brief;
      textarea.focus();
      textarea.select();
      notify('Clipboard access was unavailable. Select and copy the brief below.');
    } finally { if (button.isConnected) button.disabled = false; }
  });
  document.querySelector('#export-brief').addEventListener('click', () => {
    const data = { app: 'Dev Day Pulse', schemaVersion: 1, generation: 'deterministic-template', mode: rehearsal ? 'controlled-rehearsal' : 'attendee-experience', experiment: state.card, priceSignal: price, brief: buildExperimentBrief(state.card, state.priceId), limitation: 'One personal preference; not evidence of aggregate demand. No payment or deployment performed.' };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `devday-pulse-${state.jobId}-experiment.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    track('brief_exported');
    notify('JSON download requested. Your experiment stays yours.');
  });
  document.querySelector('#start-again').addEventListener('click', () => { state.stage = 1; render(); focusStage(); });
}

function render() {
  updateProgress();
  if (state.stage === 1) renderSelection();
  else if (state.stage === 2) renderPrice();
  else renderFinal();
}

render();
