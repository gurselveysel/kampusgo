// Disposable integrated rehearsal; no production database, IdP or key custody.
import {runSyntheticRecoveryDrill} from './lib/integrated-recovery.mjs';
console.log(JSON.stringify(await runSyntheticRecoveryDrill(),null,2));
