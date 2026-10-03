# Verification — 3 October 2026

This records the standalone app's local preparation. It is not a fresh OKX handoff or hosted deployment result.

- Node 22.22.3; pinned Vite 8.3.1; `npm ci --ignore-scripts` succeeded.
- `npm test`: **17 passed**, zero failures, exit 0. Covers all job/audience combinations, validation boundaries, safe text output, non-binding price options, consent, feedback updates with storage failures, repeated actions versus page sessions, and mounted-widget forwarding.
- `npm run build`: exit 0; static output in `dist` with no external runtime assets.
- Chrome local browser rehearsal: generated a card while recording was off, submitted feedback successfully, then opted in and generated two cards, confirmed one price, copied twice and exported once. The local controls showed **2 brief generations, 1 price preference, 2 successful copies and 1 export request**, each across **1 page session**. Earlier unconsented actions were not backfilled.
- A second feedback submission showed an update, not a second response for the page. Downloaded JSON was read back and matched the chosen job, audience, friction and non-binding price preference.
- A 390px viewport fit without horizontal page overflow. Temporary viewport override was reset. Local rehearsal data was cleared and the app left at its initial screen with recording off.

The browser automation download listener timed out, but the export action was visible and the actual downloaded JSON file was verified separately. An export event still means a request, not proof of download completion for every visitor.

Public CI will verify this repository's tests and production build after publication. LaunchLab's framework inspection is a separate check; it does not establish a cloud build, cross-device feedback, live model compatibility or settled task payment.
