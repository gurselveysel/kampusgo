# Gazi MYYS verification — 2026-10-10

- Six model tests pass: workload/coverage/evidence, role/conflict/quorum, full lifecycle, stale policy, CSV injection, unapproved issuance/transfer.
- Browser on production URL: created GZ-2026-36C65736; calculated and saved 3 AKTS with 100% declared coverage; routed to commission; rejected finalization with only one vote; recorded three distinct simulated votes; finalized; completed OBS rehearsal; issued GAZI-DEMO-7AC7EB3D; verified in local registry.
- All 17 routes opened; desktop visual review completed. Mobile drawer and 390/768 px views checked. 320 px scrollbar-related overflow was corrected by removing fixed body minimum width.
- Test-generated local records reset to the synthetic seed before handoff.
- Production deployment: dpl_HafMxKUJ2p9TqhaK5WNrLJPUaRe5. Project: prj_cZMPrJHrk7XrteeM7jeui2BktKwK. Public URL: https://gazi-unigo-myys.vercel.app/ .
- gazi.unigoturkiye.com is registered/verified in the Vercel project and aliases the production deployment. After the user signed in to IHS, added CNAME gazi -> c385e8cd360f1bb2.vercel-dns-017.com and confirmed the saved row in the DNS panel. Existing DNS entries were preserved.
- DNS propagation is incomplete at handoff: Google CNAME lookup returned the correct target from 94.138.196.9; Google A lookup from 167.172.166.241 and Cloudflare CNAME lookup still returned NXDOMAIN. Vercel still reports misconfigured and the browser returned a 502 proxy connection error. Custom-host HTTPS is not yet verified. No additional login or DNS edits are needed for the saved record to propagate.
- Final 320 px responsive check: document content width and client width both 305 px with the scrollbar, confirming no horizontal overflow.
- This is an interactive pilot, not live university integration. No real student data, payment, outbound messages or official documents were processed.
