import type { StatusServiceState } from './schema';
import type {
  StatusIncident,
  StatusIncidentPhase,
  StatusIncidentPhaseInput,
  StatusIncidentState,
  StatusIncidentWindowInput,
} from './types';

type StatusIncidentServiceStateInput = Pick<StatusIncident, 'kind' | 'phase'>;

export const getStatusIncidentState = (
  input: StatusIncidentPhaseInput,
): StatusIncidentState => {
  switch (input.phase) {
    case 'active':
      return {
        phase: input.phase,
        label: 'идет',
        tone: input.kind === 'maintenance' ? 'warning' : 'danger',
        isActive: true,
      };
    case 'scheduled':
      return {
        phase: input.phase,
        label: input.kind === 'maintenance' ? 'запланировано' : 'ожидается',
        tone: input.kind === 'maintenance' ? 'warning' : 'info',
        isActive: false,
      };
    case 'resolved':
      return {
        phase: input.phase,
        label:
          input.kind === 'maintenance'
            ? 'завершено'
            : input.service === 'dam'
              ? 'проезд открыт'
              : 'восстановлено',
        tone: input.kind === 'maintenance' ? 'muted' : 'success',
        isActive: false,
      };
  }
};

export const resolveStatusIncidentPhase = (
  input: StatusIncidentWindowInput,
  nowMs: number,
): StatusIncidentPhase => {
  if (nowMs < input.startedAt) {
    return 'scheduled';
  }

  return input.endedAt !== undefined && nowMs >= input.endedAt
    ? 'resolved'
    : 'active';
};

export const resolveStatusIncidentState = (
  input: StatusIncidentWindowInput,
  nowMs: number,
): StatusIncidentState =>
  getStatusIncidentState({
    kind: input.kind,
    service: input.service,
    phase: resolveStatusIncidentPhase(input, nowMs),
  });

export const getStatusServiceState = (
  incidents: readonly StatusIncidentServiceStateInput[],
): StatusServiceState => {
  if (
    incidents.some(
      (item) => item.kind === 'incident' && item.phase === 'active',
    )
  ) {
    return 'red';
  }

  return incidents.some(
    (item) => item.kind === 'maintenance' && item.phase === 'active',
  )
    ? 'amber'
    : 'green';
};

export const resolveStatusServiceState = (
  incidents: readonly StatusIncidentWindowInput[],
  nowMs: number,
): StatusServiceState =>
  getStatusServiceState(
    incidents.map((item) => ({
      kind: item.kind,
      phase: resolveStatusIncidentPhase(item, nowMs),
    })),
  );
