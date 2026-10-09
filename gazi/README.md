# Gazi Üniversitesi için ÜniGO MYYS

Separate, dependency-free Gazi pilot, built alongside the existing Dumlupınar application. Does not alter Dumlupınar source, state, database or deployment.

## Run

Serve this directory over HTTP. No build or package installation is necessary. `node --test model.test.mjs` runs the workflow invariants. `pilot.html` rewrites to `index.html` on Vercel.

## Scope

24 routes: the existing 17 operational views plus executive, sales, business, recognition, evidence, delivery and demo. Eleven explicitly labelled demo roles, including rector and field sales, with operation gates. All data are synthetic and persist only in origin-scoped localStorage under `unigo-gazi-myys-v1`. The guided demonstration runs in separate in-memory state and does not change the main workspace.

Working pilot flows: validated application, transparent workload and outcome matching, commission routing, distinct simulated member votes, conflict and quorum checks, reasoned majority decision, duplicate-protected OBS rehearsal, sample credential issuance and revocation, local registry lookup, programme proposals, learning plans, improvement tasks, independent appeal records, CSV/JSON exports and policy versioning.

No production authentication, university SSO, API, blockchain, electronic seal, real certificate, official academic decision, real OBS write, payment or outbound notification is implemented. These boundaries are visible in the interface. Role switching is demonstrative, not a security boundary. Audit and verification are local pilot functions, not tamper-proof infrastructure. No secrets are requested or shipped.

## v1.1 decision-maker and sales workspaces

- Four persona views with dynamic evidence, faculty/skill summaries and report exports.
- Institutional pitch/message drafts, five evidence-linked objections and a local opportunity board; no automated sending.
- Capacity/ROI scenario and dated, net-of-VAT 22/d comparison; no guarantee of procurement eligibility.
- Versioned, editable recognition policy with prior-credit records. Both commission approval and OBS rehearsal enforce the cap. The illustrative 10% policy is not presented as a universal YÖK rule. Unknown prior credit is blocked, not assumed zero.
- Traceable lexical syllabus suggestions. This is not an AI or semantic model and does not award credits.
- Local PDF/JSON SHA-256 inspection and a real ECDSA P-256 signature/tamper laboratory. The custom pilot envelope is neither OB3/VC conformance nor an authorized institutional credential. Issuer trust stays unverified even when the signature verifies.
- A bounded three-attempt outbox, duplicate protection and current-policy revalidation. Success writes only the local rehearsal log.
- Technical acceptance checklist and white-label preview; no production connection is enabled by checking a box.
- Credential expiry history with explicit rationale; expiry never deletes academic decisions or transcript rehearsals.
- Guided five-stage, three-minute demonstration with an insufficient-quorum example and a 9 + 3 = 12 AKTS / 240 AKTS example.

Run all 20 workflow checks with `node --test model.test.mjs governance.test.mjs` from this directory. This release adds `governance.mjs`, `workspace.js` and `workspace.css` to the deployed source files.

## Sources and authority gaps (checked 2026-10-10, Türkiye)

- Gazi official brand guide: https://gazi.edu.tr/view/page/237161/kurumsal-kimlik-kilavuzu
- Original logo: https://gazi.edu.tr/frontend/img/gazilogo100x100.png (copied unmodified; displayed at 50 px)
- Gazi education planning: https://akts-egitimplanlama.gazi.edu.tr/view/page/241480
- European micro-credential approach: https://education.ec.europa.eu/education-levels/higher-education/micro-credentials
- EQF descriptors: https://europass.europa.eu/en/description-eight-eqf-levels

UI architecture separates workload, outcomes, evidence, decision, certification and recognition. Numbers such as 25 hours/ECTS, 70% coverage, 3 members and 2 same-direction votes are explicitly pilot assumptions, not verified Gazi policy. Gazi senate/local directive, appointments, local credit conversion, appeal deadlines, KVKK/retention controls, production authentication, signing authority and interface contracts remain unverified. No full compliance or formal institutional endorsement claim is made. Dumlupınar-specific norms and data are not reused as Gazi policy.

## Deployment

Vercel project: `gazi-unigo-myys`, team `team_QH2k9edmHSXuybZK3Ay9RVAo`. Target hostname: `gazi.unigoturkiye.com`. DNS is externally hosted at IHS; a CNAME is required before that hostname works. Deploy only this `gazi` directory, excluding tests and README if using the file API. CSP limits execution and connections to same origin.
