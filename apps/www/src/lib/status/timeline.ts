import { compareRuText } from '@shelkovo/format';

import type { StatusArea, StatusKind } from './schema';
import type { StatusDuration, StatusIncident } from './types';

export const STATUS_TIMELINE_DAY_MS = 24 * 60 * 60 * 1000;

export interface StatusTimelineIncidentInput {
  readonly id: string;
  readonly href?: string;
  readonly title: string;
  readonly kind: StatusKind;
  readonly startedIso: string;
  readonly startedHasTime: boolean;
  readonly endedIso?: string;
  readonly endedHasTime: boolean;
  readonly isActive: boolean;
  readonly areas?: readonly StatusArea[];
  readonly duration?: StatusDuration;
}

export interface StatusTimelineRange {
  readonly startMs: number;
  readonly endMs: number;
  readonly days: number;
  readonly spanMs: number;
}

export interface StatusTimelineSpan {
  readonly startMs: number;
  readonly endMs: number;
}

export interface StatusTimelineProblemSegment extends StatusTimelineSpan {
  readonly id: string;
  readonly href?: string;
  readonly tone: 'amber' | 'red';
  readonly leftPercent: number;
  readonly widthPercent: number;
  readonly startedIso: string;
  readonly endedIso?: string;
}

export interface StatusTimelineStableSegment extends StatusTimelineSpan {
  readonly leftPercent: number;
  readonly widthPercent: number;
}

export interface StatusTimelineSegmentGeometry {
  readonly leftPercent: number;
  readonly widthPercent: number;
}

export const toStatusTimelineIncidentInput = (
  incident: StatusIncident,
): StatusTimelineIncidentInput => ({
  id: incident.id,
  href: incident.url,
  title: incident.title,
  kind: incident.kind,
  startedIso: incident.started.iso,
  startedHasTime: incident.started.hasTime,
  endedIso: incident.ended?.iso,
  endedHasTime: incident.ended?.hasTime ?? false,
  isActive: incident.isActive,
  areas: incident.appliesToAllAreas ? undefined : incident.areas,
  duration: incident.duration,
});

interface BuildStatusTimelineProblemSegmentsInput {
  readonly incidents: readonly StatusTimelineIncidentInput[];
  readonly range: StatusTimelineRange;
}

interface ClipStatusTimelineSpanInput {
  readonly startMs: number;
  readonly endMs?: number;
}

const hasValidRange = (range: StatusTimelineRange): boolean =>
  Number.isFinite(range.startMs) &&
  Number.isFinite(range.endMs) &&
  range.spanMs > 0 &&
  range.endMs > range.startMs;

const toStatusTimelinePercent = (
  valueMs: number,
  range: StatusTimelineRange,
): number => ((valueMs - range.startMs) / range.spanMs) * 100;

export const getStatusTimelineSegmentGeometry = (
  span: StatusTimelineSpan,
  range: StatusTimelineRange,
): StatusTimelineSegmentGeometry => ({
  leftPercent: toStatusTimelinePercent(span.startMs, range),
  widthPercent: ((span.endMs - span.startMs) / range.spanMs) * 100,
});

const toStatusTimelineSegment = <T extends StatusTimelineSpan>(
  span: T,
  range: StatusTimelineRange,
): T & StatusTimelineSegmentGeometry => ({
  ...span,
  ...getStatusTimelineSegmentGeometry(span, range),
});

export const getStatusTimelineRange = (
  nowMs: number,
  days: number,
): StatusTimelineRange => {
  if (!Number.isFinite(nowMs) || !Number.isFinite(days) || days <= 0) {
    return {
      startMs: 0,
      endMs: 0,
      days: 0,
      spanMs: 0,
    };
  }

  const spanMs = days * STATUS_TIMELINE_DAY_MS;

  return {
    startMs: nowMs - spanMs,
    endMs: nowMs,
    days,
    spanMs,
  };
};

export const clipStatusTimelineSpan = (
  input: ClipStatusTimelineSpanInput,
  range: StatusTimelineRange,
): StatusTimelineSpan | undefined => {
  if (!hasValidRange(range) || !Number.isFinite(input.startMs)) {
    return undefined;
  }

  const endMs = input.endMs ?? range.endMs;

  if (!Number.isFinite(endMs) || endMs <= input.startMs) {
    return undefined;
  }

  if (endMs <= range.startMs || input.startMs >= range.endMs) {
    return undefined;
  }

  const startMs = Math.max(range.startMs, input.startMs);
  const clippedEndMs = Math.min(range.endMs, endMs);

  if (clippedEndMs <= startMs) {
    return undefined;
  }

  return {
    startMs,
    endMs: clippedEndMs,
  };
};

export const buildStatusTimelineProblemSegments = ({
  incidents,
  range,
}: BuildStatusTimelineProblemSegmentsInput): readonly StatusTimelineProblemSegment[] => {
  if (!hasValidRange(range)) {
    return [];
  }

  return incidents
    .map((incident) => {
      const startMs = Date.parse(incident.startedIso);
      const endMs = incident.endedIso
        ? Date.parse(incident.endedIso)
        : undefined;
      const span = clipStatusTimelineSpan(
        {
          startMs,
          endMs,
        },
        range,
      );

      if (!span) {
        return undefined;
      }

      return toStatusTimelineSegment(
        {
          id: incident.id,
          href: incident.href,
          tone: incident.kind === 'maintenance' ? 'amber' : 'red',
          startedIso: incident.startedIso,
          endedIso: incident.endedIso,
          ...span,
        },
        range,
      ) satisfies StatusTimelineProblemSegment;
    })
    .filter((segment) => segment !== undefined)
    .sort(
      (a, b) =>
        a.startMs - b.startMs || a.endMs - b.endMs || compareRuText(a.id, b.id),
    );
};

export const mergeStatusTimelineSpans = (
  spans: readonly StatusTimelineSpan[],
): readonly StatusTimelineSpan[] => {
  const sorted = spans
    .filter(
      (span) =>
        Number.isFinite(span.startMs) &&
        Number.isFinite(span.endMs) &&
        span.endMs > span.startMs,
    )
    .toSorted((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  if (sorted.length === 0) {
    return [];
  }

  return sorted.reduce<StatusTimelineSpan[]>((merged, span) => {
    const last = merged.at(-1);

    if (!last || span.startMs > last.endMs) {
      merged.push(span);
      return merged;
    }

    merged[merged.length - 1] = {
      startMs: last.startMs,
      endMs: Math.max(last.endMs, span.endMs),
    };

    return merged;
  }, []);
};

export const buildStatusTimelineStableSegments = (
  problemSegments: readonly StatusTimelineSpan[],
  range: StatusTimelineRange,
): readonly StatusTimelineStableSegment[] => {
  if (!hasValidRange(range)) {
    return [];
  }

  const merged = mergeStatusTimelineSpans(problemSegments);

  if (merged.length === 0) {
    return [
      toStatusTimelineSegment(
        {
          startMs: range.startMs,
          endMs: range.endMs,
        },
        range,
      ),
    ];
  }

  const stable: StatusTimelineStableSegment[] = [];
  let cursor = range.startMs;

  merged.forEach((span) => {
    if (span.startMs > cursor) {
      stable.push(
        toStatusTimelineSegment(
          {
            startMs: cursor,
            endMs: span.startMs,
          },
          range,
        ),
      );
    }

    cursor = Math.max(cursor, span.endMs);
  });

  if (cursor < range.endMs) {
    stable.push(
      toStatusTimelineSegment(
        {
          startMs: cursor,
          endMs: range.endMs,
        },
        range,
      ),
    );
  }

  return stable;
};
