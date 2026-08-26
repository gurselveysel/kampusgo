import assert from "node:assert/strict";
import {
  buildDebrief,
  createSession,
  getActionAvailability,
  hashState,
  reduceSession,
  replaySession,
  TYC_EVIDENCE,
  UCEP_EVIDENCE,
} from "../app/medikal-simulasyon/clinical-engine.js";

function run(events, mode = "training", seed = 424242) {
  return events.reduce((session, event) => reduceSession(session, event), createSession({ mode, seed }));
}

const goldenEvents = [
  { type: "ASK_PATIENT", topic: "onset" },
  { type: "ASK_PATIENT", topic: "medications" },
  { type: "ASK_PATIENT", topic: "associated" },
  { type: "PERFORM_EXAM", actionId: "general" },
  { type: "PERFORM_EXAM", actionId: "cardiovascular" },
  { type: "ORDER_TEST", actionId: "ecg" },
  { type: "PERFORM_INTERVENTION", actionId: "monitor_iv" },
  { type: "ADVANCE_TIME", seconds: 120 },
  { type: "ADMINISTER_MEDICATION", actionId: "aspirin" },
  { type: "ADMINISTER_MEDICATION", actionId: "heparin" },
  { type: "TEAM_ACTION", actionId: "assign_roles" },
  { type: "TEAM_ACTION", actionId: "closed_loop" },
  { type: "TEAM_ACTION", actionId: "cardiology_consult" },
  { type: "PERFORM_INTERVENTION", actionId: "activate_cath" },
  { type: "PERFORM_INTERVENTION", actionId: "transfer_cath" },
  { type: "PERFORM_INTERVENTION", actionId: "handoff_sbar" },
];

const goldenA = run(goldenEvents);
const goldenB = run(goldenEvents);
assert.equal(hashState(goldenA.state), hashState(goldenB.state), "same seed and event sequence must produce the same final hash");
assert.equal(goldenA.state.status, "completed", "golden scenario must reach completed handoff");
assert.equal(replaySession(goldenA.initial, goldenA.records).matches, true, "event log must replay to the same hash");
assert.equal(buildDebrief(goldenA).competencyMet, true, "golden path must meet the pilot rubric");

const invalid = run([{ type: "PERFORM_INTERVENTION", actionId: "defibrillate" }]);
assert.equal(invalid.records[0].accepted, false, "defibrillation outside VF must be rejected");
assert.equal(invalid.records[0].previousHash, invalid.records[0].nextHash, "invalid transition must not mutate patient state");

const contraindication = run([
  { type: "ASK_PATIENT", topic: "medications" },
  { type: "ADMINISTER_MEDICATION", actionId: "nitroglycerin" },
]);
assert.equal(contraindication.state.safetyEvents[0]?.code, "PDE5_NITRATE", "contraindicated nitrate must emit a safety event");
assert.ok(contraindication.state.vitals.systolic < 90, "contraindication must affect physiology-derived blood pressure");

const tests = run([{ type: "ORDER_TEST", actionId: "troponin" }]);
assert.equal(tests.state.orders[0].status, "pending", "test result must not be immediate");
assert.equal(tests.state.orders[0].readyAtSeconds, 900, "troponin must carry a deterministic result time");
assert.equal(tests.state.financialCost, 180, "test must carry a cost");

const delayed = run([
  { type: "ORDER_TEST", actionId: "ecg" },
  { type: "ADVANCE_TIME", seconds: 900 },
]);
assert.equal(delayed.state.phase, "vf", "untreated time progression must be able to branch to VF");
assert.equal(delayed.state.vitals.rhythm, "vf", "monitor rhythm must follow physiology state");

const osce = run([{ type: "ASK_PATIENT", topic: "onset" }], "osce");
assert.equal(osce.records[0].publicFeedback, "Karar kaydedildi.", "OSCE must hide explanatory feedback");
const training = run([{ type: "ASK_PATIENT", topic: "onset" }], "training");
assert.match(training.records[0].publicFeedback, /Hasta:/, "training must expose explanatory feedback");

assert.equal(UCEP_EVIDENCE.every((item) => item.status === "DOĞRULANMADI"), true, "unapproved UCEP mappings must remain explicit");
assert.equal(TYC_EVIDENCE.proposedLevel, null, "TYC level must not be inferred");
assert.equal(TYC_EVIDENCE.officialPlacementStatus, "DOĞRULANMADI", "TYC placement must remain unverified");
assert.equal(getActionAvailability(createSession().state, "intervention", "defibrillate").available, false, "UI availability must expose the same state-machine guard");

console.log(`Clinical simulation engine contract passed: ${goldenA.records.length} golden events, ${UCEP_EVIDENCE.length} UCEP evidence records.`);
