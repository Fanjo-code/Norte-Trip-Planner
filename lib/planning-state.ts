import type { PlanningStage, PlanningStageName, PlanningState, Trip } from '@/types/trip';

export function mergePlanningStage(
  current: Trip,
  name: PlanningStageName,
  value: PlanningStage,
  patch: Partial<Trip> = {},
  planningPatch: Partial<PlanningState> = {},
): Trip {
  if (!current.planning) return { ...current, ...patch };
  return {
    ...current,
    ...patch,
    planning: {
      ...current.planning,
      ...planningPatch,
      revision: current.planning.revision + 1,
      stages: { ...current.planning.stages, [name]: value },
    },
  };
}

export function interruptRunningStages(current: Trip, timestamp = new Date().toISOString()): Trip {
  if (!current.planning) return current;
  let changed = false;
  const stages = { ...current.planning.stages };
  for (const name of Object.keys(stages) as PlanningStageName[]) {
    if (stages[name].state !== 'running') continue;
    changed = true;
    stages[name] = {
      state: 'interrupted',
      updatedAt: timestamp,
      errorCode: 'INTERRUPTED',
      message: 'This update stopped when Norte closed. You can retry it.',
      retryable: true,
    };
  }
  return changed
    ? {
        ...current,
        planning: { ...current.planning, stages, revision: current.planning.revision + 1 },
      }
    : current;
}
