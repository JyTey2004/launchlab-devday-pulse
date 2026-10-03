# Manual LaunchLab rehearsal — Dev Day Pulse

Rehearsal: **4 October 2026, Singapore time**. Finale: **7 October**, approximately **3 minutes** for the pitch and demo.

Dev Day Pulse lets an attendee choose an agent job and audience, generate an experiment card, record a nonbinding price signal, and copy or download the brief. Optional observations and feedback are local until an approved LaunchLab deployment adds a collection service. A price signal is an expression of interest, not a payment, purchase, or verified demand.

This checklist prepares a new controlled test. It does not authorize a task, model request, payment, source change, or deployment by itself.

## Before starting

- [ ] Record the **public repository URL and full commit SHA** below. Use that exact version throughout the test.
- [ ] Build and inspect the local app. Use the repository's install/build instructions and the URL printed by its development server.
- [ ] Check the runtime, wallet session, current task admission, and available hosting capacity again. Yesterday's green snapshot does not reserve a slot.
- [ ] Read LaunchLab's current service listing and fee. Do not assume an earlier fee remains current.
- [ ] Use a **new OKX task** for Dev Day Pulse. The earlier expired task and its unused, task-bound conversation grant cannot be transferred to this new job.
- [ ] Keep private login details, credentials and operator records out of the brief, public repository and demo recording.

| Test record | Value to record before the task |
| --- | --- |
| Public repository | https://github.com/JyTey2004/launchlab-devday-pulse |
| Full commit SHA | Use the SHA in the prepared pinned request, or resolve and approve a newer SHA explicitly |
| Intended audience | OKX Dev Day attendees exploring agent services |
| Hypothesis | Attendees can turn an agent-service idea into a testable experiment brief and express a nonbinding willingness to pay |
| Cohort | Controlled/internal rehearsal; no organic traction claim |
| Collection | Opted-in activity plus voluntary feedback, as specified in the reviewed plan |
| Finish condition | Verified preview, four measured actions, one feedback response, repeated-action accounting, and a matching returned report |

## Start through LaunchLab

Open LaunchLab's service listing from its website and review the service before creating a task. Submit the pinned repository, audience, hypothesis and measurement requirements. Specify that this is a controlled rehearsal, and ask the agent to pause at each required budget or deployment approval.

Use this brief after replacing the repository and commit placeholders:

> Inspect Dev Day Pulse at PUBLIC_REPOSITORY_URL, commit FULL_COMMIT_SHA. Help me test whether OKX Dev Day attendees can choose an agent job and audience, create an experiment brief, express a nonbinding price signal, and copy or export the brief. Track brief_created, price_signal_submitted, brief_copied and brief_exported, plus voluntary feedback, with consent and a controlled-test cohort. Show me the source changes, exact budgets, hosting terms and deployment plan before executing them. Return the verified preview and a report that separates raw action counts from unique sessions. Do not make payments, change the pinned version, or treat price signals as purchases.

Creating or funding the task covers only the displayed task fee. It does not approve other spending.

## Answer the approval cards

| Card | Review before answering | Your response |
| --- | --- | --- |
| Task creation/payment | Current provider, selected service, pinned brief, displayed fee and escrow terms | Approve only if those details match |
| Task-conversation model budget | New task binding, GPT-6 Luna, call/token ceilings, maximum USD amount, expiry and rate ceilings | **Yes** to that exact quote, or **No** |
| Planning model budget | Same task and pinned source, purpose `planning`, revision/digest, separate call/token/USD limits and expiry | **Yes** to that exact quote, or **No** |
| Source and deployment plan | Framework/build, tracking and feedback changes, consent/cohort rules, public/private access, AWS costs, retention and retirement responsibility | **Yes** to the current complete plan, or **No** |
| Delivered-result review | Preview and report match the task, source version and completed checks | Approve only after inspection; otherwise give the required reason |

A short **Yes** is useful only when it answers a particular current card. A changed version, budget or plan needs a new review. Conversation approval does not approve planning; neither model budget approves hosting. If anything is missing, answer **No** and request a corrected card.

Model-budget ceilings and expiry govern model requests. They are **not a hard AWS hosting spending cap or automatic app expiry**. Confirm who will retire the preview and when; hosting continues until retirement is performed and verified.

## Exercise the deployed app

Open the exact returned preview and follow its access instructions. Opt into the reviewed collection mechanism and mark the session as a controlled test. Keep that tab/session for the repeat check.

First decline tracking and complete a throwaway interaction. Confirm that feedback remains usable and those activity events do not reach the collector. Then opt in; prior actions must not be backfilled. The counts below apply to the opted-in actions only. The default managed preview is password-protected; keep login and report access private. Agree attendee access separately before sharing a QR code.

1. Select an agent job and audience, then create one experiment card. Use **Change my problem** and create it a second time. Expect **two `brief_created` actions across one browser session**.
2. Submit one nonbinding price signal. Expect **one `price_signal_submitted` action**. Verify that the UI promises no charge or purchase.
3. Copy the brief once. Expect **one `brief_copied` action**; confirm the clipboard contains the displayed brief.
4. Download/export the brief once. Expect **one `brief_exported` action**; open the file and check that it matches the card.
5. Give one substantive feedback response, such as what was confusing and what would make the service useful. Confirm it appears in the returned report.
6. **Copy the brief a second time in the same session.** The raw copy-action count should now be **two**, across **one browser session**. This does not verify a unique human. Compare the correct metric labels rather than treating these numbers as interchangeable.

Wait for the collector's stated refresh interval, then request results from the same OKX task or open the authenticated results dashboard. Check both the event totals and feedback receipt. If the deployment provides only local observations, it has not yet proven cross-device collection; report that limitation rather than claiming backend validation.

## Inspect the returned result

- [ ] Preview opens and all four actions work.
- [ ] Delivered source matches the pinned commit and approved instrumentation changes.
- [ ] Report includes the experiment hypothesis, measured cohort, time window and denominators.
- [ ] Two generations, one price confirmation, two successful copies, one export request and the feedback are accounted for. Repeat feedback within that page should update the same response.
- [ ] Controlled/internal traffic is separated from organic activity. No verified-user, sale or incentive-payout claim is inferred from this rehearsal.
- [ ] Private access is supplied privately, and the public deliverable contains no credentials.
- [ ] The provider's returned artifact matches what you tested before approving delivery or releasing escrow.

## Stop and recover once

If a step fails, **stop that attempt** and record its stage, time, safe error and whether a model request, queue entry, deployment or payment actually began. Do not create another task or repeat an uncertain payment/deployment/model request to “see if it works.”

Ask for diagnosis and a bounded **single retry** only after the outcome and remaining budget are reconciled. A retry that queued successfully is not proof of completion. If its result is unknown, or spending may have begun, stop again for reconciliation. Never revive an old approval card or reuse the expired task's grant.

## Fit the finale into three minutes

- **0:00–0:25:** Explain the gap: a working repository needs a deployed experiment and observable feedback before a founder can learn from it.
- **0:25–1:00:** Show the pinned Dev Day Pulse repository and the exact LaunchLab approval cards.
- **1:00–2:00:** Show the verified preview, create the card, submit a price signal, copy/export and give feedback.
- **2:00–2:40:** Show returned results, including the repeated-action count and the controlled-test label.
- **2:40–3:00:** Explain the OKX task handoff and the founder's next decision.

Use the recorded successful rehearsal as a fallback if hosting or network latency exceeds the pitch window. Clearly distinguish recorded evidence from a live action. Claim the full new journey only after the rehearsal actually completes.
