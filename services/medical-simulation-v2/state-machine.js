import { createActor, createMachine } from "xstate";

export const clinicalMachine = createMachine({
  id: "teys-stemi-v2",
  type: "parallel",
  states: {
    clinical: {
      initial: "assessment",
      states: {
        assessment: {
          on: {
            ECG_CONFIRMED: "stemi",
            VF_DETECTED: "vf",
          },
        },
        stemi: {
          on: {
            CATH_ACTIVATED: "treatment",
            VF_DETECTED: "vf",
          },
        },
        treatment: {
          on: {
            VF_DETECTED: "vf",
            ROSC_ACHIEVED: "rosc",
          },
        },
        vf: {
          on: { ROSC_ACHIEVED: "rosc" },
        },
        rosc: {
          on: { HANDOFF_COMPLETED: "handoff" },
        },
        handoff: { type: "final" },
      },
    },
    team: {
      initial: "unassigned",
      states: {
        unassigned: { on: { ROLES_ASSIGNED: "assigned" } },
        assigned: {
          on: {
            CLOSED_LOOP_STARTED: "closedLoop",
            HANDOFF_COMPLETED: "handedOff",
          },
        },
        closedLoop: { on: { HANDOFF_COMPLETED: "handedOff" } },
        handedOff: { type: "final" },
      },
    },
    lifecycle: {
      initial: "active",
      states: {
        active: { on: { HANDOFF_COMPLETED: "completed" } },
        completed: { type: "final" },
      },
    },
  },
});

export function replayMachine(machineEvents = []) {
  const actor = createActor(clinicalMachine);
  actor.start();
  for (const event of machineEvents) actor.send({ type: event });
  const snapshot = actor.getSnapshot();
  const value = JSON.parse(JSON.stringify(snapshot.value));
  actor.stop();
  return value;
}

export function phaseFromMachine(value) {
  return typeof value?.clinical === "string" ? value.clinical : "assessment";
}

export function teamStateFromMachine(value) {
  return typeof value?.team === "string" ? value.team : "unassigned";
}
