# Gazi Üniversitesi için ÜniGO MYYS

Separate, dependency-free Gazi pilot, built alongside the existing Dumlupınar application. Does not alter Dumlupınar source, state, database or deployment.

## Run

Serve this directory over HTTP. No build or package installation is necessary. `node --test model.test.mjs` runs the workflow invariants. `pilot.html` rewrites to `index.html` on Vercel.

## Scope

17 routes: overview, applications, catalog, credit matching, learning outcomes, commission, appeals, credentials, wallet, OBS rehearsal, integrations, pathways, quality, finance, notifications, audit and institutional rules. Nine explicitly labelled demo roles, with operation gates. All data are synthetic and persist only in origin-scoped localStorage under `unigo-gazi-myys-v1`.

Working pilot flows: validated application, transparent workload and outcome matching, commission routing, distinct simulated member votes, conflict and quorum checks, reasoned majority decision, duplicate-protected OBS rehearsal, sample credential issuance and revocation, local registry lookup, programme proposals, learning plans, improvement tasks, independent appeal records, CSV/JSON exports and policy versioning.

No production authentication, university SSO, API, blockchain, electronic seal, real certificate, official academic decision, real OBS write, payment or outbound notification is implemented. These boundaries are visible in the interface. Role switching is demonstrative, not a security boundary. Audit and verification are local pilot functions, not tamper-proof infrastructure. No secrets are requested or shipped.

## Sources and authority gaps (checked 2026-10-10, Türkiye)

- Gazi official brand guide: https://gazi.edu.tr/view/page/237161/kurumsal-kimlik-kilavuzu
- Original logo: https://gazi.edu.tr/frontend/img/gazilogo100x100.png (copied unmodified; displayed at 50 px)
- Gazi education planning: https://akts-egitimplanlama.gazi.edu.tr/view/page/241480
- European micro-credential approach: https://education.ec.europa.eu/education-levels/higher-education/micro-credentials
- EQF descriptors: https://europass.europa.eu/en/description-eight-eqf-levels

UI architecture separates workload, outcomes, evidence, decision, certification and recognition. Numbers such as 25 hours/ECTS, 70% coverage, 3 members and 2 same-direction votes are explicitly pilot assumptions, not verified Gazi policy. Gazi senate/local directive, appointments, local credit conversion, appeal deadlines, KVKK/retention controls, production authentication, signing authority and interface contracts remain unverified. No full compliance or formal institutional endorsement claim is made. Dumlupınar-specific norms and data are not reused as Gazi policy.

## Deployment

Vercel project: `gazi-unigo-myys`, team `team_QH2k9edmHSXuybZK3Ay9RVAo`. Working publication: https://gazi-unigo-myys.vercel.app/ . Target hostname: `gazi.unigoturkiye.com`. DNS is externally hosted at IHS; the CNAME `gazi -> c385e8cd360f1bb2.vercel-dns-017.com` was saved on 2026-10-10 (Türkiye). DNS propagation completed and custom-host HTTPS was verified on 2026-10-10 (Türkiye). See VERIFICATION.md for observed results. Deploy only this `gazi` directory, excluding tests and documentation if using the file API. CSP limits execution and connections to same origin.

## Original brand assets — 2026-10-10

The Turkish ÜniGO image and go favicon are copied byte-for-byte from the existing corporate site: https://unigoturkiye.com/unigo-logo-tr.png and https://unigoturkiye.com/favicon-go-v1.svg . The sidebar now uses an image instead of a text recreation; desktop and mobile drawer share that same original asset.
