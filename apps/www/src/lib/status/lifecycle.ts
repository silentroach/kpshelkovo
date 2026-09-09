import type { StatusServiceState } from './schema';
import type {
  StatusIncident,
  StatusIncidentPhase,
  StatusIncidentPhaseInput,
  StatusIncidentState,
  StatusIncidentWindowInput
} from './types';

type StatusIncidentServiceStateInput = Pick<StatusIncident, 'kind' | 'phase'>;

export const toStatusIncidentWindowInput = (
  incident: Pick<StatusIncident, 'ended' | 'kind' | 'started'>
): StatusIncidentWindowInput => ({
  kind: incident.kind,
  start: incident.started.at.valueOf(),
  end: incident.ended?.at.valueOf()
});

const isStatusIncidentWindow = (value: unknown): value is StatusIncidentWindowInput => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<StatusIncidentWindowInput>;

  return (
    (candidate.kind === 'incident' || candidate.kind === 'maintenance') &&
    typeof candidate.start === 'number' &&
    Number.isFinite(candidate.start) &&
    (candidate.end === undefined ||
      (typeof candidate.end === 'number' &&
        Number.isFinite(candidate.end) &&
        candidate.start <= candidate.end))
  );
};

export const parseStatusIncidentWindows = (
  value?: string
): readonly StatusIncidentWindowInput[] | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    return Array.isArray(parsed) && parsed.every(isStatusIncidentWindow) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const getStatusIncidentState = (input: StatusIncidentPhaseInput): StatusIncidentState => {
  switch (input.phase) {
    case 'active':
      return {
        phase: input.phase,
        label: 'идет',
        tone: input.kind === 'maintenance' ? 'warning' : 'danger',
        isActive: true
      };
    case 'scheduled':
      return {
        phase: input.phase,
        label: input.kind === 'maintenance' ? 'запланировано' : 'ожидается',
        tone: input.kind === 'maintenance' ? 'warning' : 'info',
        isActive: false
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
        isActive: false
      };
  }
};

export const resolveStatusIncidentPhase = (
  input: StatusIncidentWindowInput,
  nowMs: number
): StatusIncidentPhase => {
  if (nowMs < input.start) {
    return 'scheduled';
  }

  return input.end !== undefined && nowMs >= input.end ? 'resolved' : 'active';
};

export const resolveStatusIncidentState = (
  input: StatusIncidentWindowInput,
  nowMs: number
): StatusIncidentState =>
  getStatusIncidentState({
    kind: input.kind,
    service: input.service,
    phase: resolveStatusIncidentPhase(input, nowMs)
  });

export const getStatusServiceState = (
  incidents: readonly StatusIncidentServiceStateInput[]
): StatusServiceState => {
  if (incidents.some((item) => item.kind === 'incident' && item.phase === 'active')) {
    return 'red';
  }

  return incidents.some((item) => item.kind === 'maintenance' && item.phase === 'active')
    ? 'amber'
    : 'green';
};

export const isActiveOrScheduledMaintenance = (
  incident: StatusIncidentServiceStateInput
): boolean => incident.kind === 'maintenance' && incident.phase !== 'resolved';

export const resolveStatusServiceState = (
  incidents: readonly StatusIncidentWindowInput[],
  nowMs: number
): StatusServiceState =>
  getStatusServiceState(
    incidents.map((item) => ({
      kind: item.kind,
      phase: resolveStatusIncidentPhase(item, nowMs)
    }))
  );
