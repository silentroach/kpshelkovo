import { formatDate } from '@shelkovo/format';

import { resolveStatusIncidentPhase, toStatusIncidentWindowInput } from '@/lib/status/lifecycle';
import { STATUS_SERVICES } from '@/lib/status/schema';

import type {
  HomeServiceIncident,
  HomeServiceMessage,
  HomeServiceWindowsPayload
} from './service-summary.types';

export const getHomeServiceWindows = (
  incidents: readonly HomeServiceIncident[],
  buildNow: number
): HomeServiceWindowsPayload =>
  STATUS_SERVICES.flatMap((service) => {
    const windows = incidents
      .filter((incident) => incident.service === service)
      .map(toStatusIncidentWindowInput)
      .filter((window) => resolveStatusIncidentPhase(window, buildNow) !== 'resolved');

    return windows.length ? [{ service, windows }] : [];
  });

const messagePriority = (message: HomeServiceMessage): number =>
  message.phase === 'scheduled' ? 2 : message.kind === 'incident' ? 0 : 1;

export const getHomeServiceMessages = (
  payload: HomeServiceWindowsPayload,
  nowMs: number
): readonly HomeServiceMessage[] => {
  const now = new Date(nowMs);
  const messages = payload.flatMap(({ service, windows }): readonly HomeServiceMessage[] => {
    const window =
      windows.find(
        (item) => item.kind === 'incident' && resolveStatusIncidentPhase(item, nowMs) === 'active'
      ) ??
      windows.find(
        (item) =>
          item.kind === 'maintenance' && resolveStatusIncidentPhase(item, nowMs) === 'active'
      ) ??
      windows
        .filter((item) => resolveStatusIncidentPhase(item, nowMs) === 'scheduled')
        .sort(
          (a, b) =>
            a.start - b.start || Number(a.kind === 'maintenance') - Number(b.kind === 'maintenance')
        )[0];
    if (!window) {
      return [];
    }

    const phase = resolveStatusIncidentPhase(window, nowMs);
    if (phase === 'resolved') {
      return [];
    }

    let label = window.kind === 'incident' ? 'Перебой' : 'Идут работы';
    if (phase === 'scheduled') {
      const date = formatDate(new Date(window.start).toISOString(), now);
      label = `${window.kind === 'incident' ? 'Перебой' : 'Работы'} с ${date}`;
    }

    return [{ service, phase, kind: window.kind, label, start: window.start }];
  });

  return messages.sort(
    (a, b) =>
      messagePriority(a) - messagePriority(b) ||
      (a.phase === 'scheduled' && b.phase === 'scheduled' ? a.start - b.start : 0) ||
      STATUS_SERVICES.indexOf(a.service) - STATUS_SERVICES.indexOf(b.service)
  );
};

export const parseHomeServiceWindows = (value?: string): HomeServiceWindowsPayload | undefined => {
  if (!value) {
    return;
  }

  try {
    return JSON.parse(value) as HomeServiceWindowsPayload;
  } catch {
    return;
  }
};
