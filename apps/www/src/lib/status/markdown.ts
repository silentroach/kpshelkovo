import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument,
  type MarkdownPhrasingInput,
} from '@shelkovo/markdown';

import { absoluteUrl } from '../site';
import type {
  StatusDataset,
  StatusIncident,
  StatusServiceSummary,
} from './types';
import { statusIncidentMarkdownUrl, statusServiceMarkdownUrl } from './routes';
import {
  formatStatusArea,
  formatStatusIncidentPeriodText,
  formatStatusKind,
  formatStatusService,
  formatStatusServiceState,
  getStatusIncidentPhase,
} from './view';

const abs = (value: string): string => absoluteUrl(value);

type MarkdownNode = ReturnType<typeof parseMarkdownFragment>[number];
type MarkdownListItem = ReturnType<typeof md.listItem>;
type MarkdownPhrasingNodes = Exclude<MarkdownPhrasingInput, string>;
type MarkdownPhrasingNode = MarkdownPhrasingNodes[number];

const serialize = (children: readonly MarkdownNode[]): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children }));

const pick = <T>(items: readonly (T | undefined)[]): readonly T[] =>
  items.filter((item): item is T => item !== undefined);

const phrase = (value: MarkdownPhrasingInput): MarkdownPhrasingNodes =>
  typeof value === 'string' ? [md.text(value)] : value;

function row(
  label: string,
  value?: MarkdownPhrasingInput,
): MarkdownListItem | undefined {
  if (!value) {
    return undefined;
  }

  return md.listItem([md.paragraph([md.text(`${label}: `), ...phrase(value)])]);
}

const section = (
  title: string,
  rows: readonly MarkdownListItem[],
): readonly MarkdownNode[] => [
  md.heading(2, title),
  md.list(rows.length > 0 ? rows : [md.listItem('Нет данных.')]),
];

const inline = (value: string): string => value.replace(/\s+/gu, ' ').trim();

const statusDate = (iso: string, hasTime: boolean): string =>
  hasTime ? iso : iso.slice(0, 10);

const sourceMarkdownLink = (url: string): ReturnType<typeof md.link> =>
  md.link(abs(url), 'источник');

const incidentMarkdownLabel = (
  incident: StatusIncident,
): MarkdownPhrasingNodes =>
  incident.hasPage
    ? [md.link(incidentMarkdownHref(incident), incident.title)]
    : [md.text(incident.title)];

const incidentMarkdownHref = (
  incident: Pick<StatusIncident, 'year' | 'month' | 'slug'>,
): string => abs(statusIncidentMarkdownUrl(incident));

const areaLabels = (
  incident: Pick<StatusIncident, 'appliesToAllAreas' | 'areas'>,
): readonly string[] =>
  incident.appliesToAllAreas
    ? []
    : incident.areas.map((area) => formatStatusArea(area));

const incidentFrontmatter = (
  incident: StatusIncident,
): Readonly<Record<string, unknown>> => {
  const areas = areaLabels(incident);

  return {
    title: incident.title,
    service: {
      id: incident.service,
      name: formatStatusService(incident.service),
    },
    kind: {
      id: incident.kind,
      name: formatStatusKind(incident.kind),
    },
    phase: getStatusIncidentPhase(incident).label,
    startedAt: statusDate(incident.started.iso, incident.started.hasTime),
    startedHasTime: incident.started.hasTime,
    ...(incident.ended
      ? {
          endedAt: statusDate(incident.ended.iso, incident.ended.hasTime),
          endedHasTime: incident.ended.hasTime,
        }
      : {}),
    ...(areas.length > 0 ? { areas } : {}),
    ...(incident.sourceUrl ? { sourceUrl: abs(incident.sourceUrl) } : {}),
  };
};

function incidentLine(
  incident: StatusIncident,
  opts?: {
    readonly hideIncidentPhase?: boolean;
  },
): MarkdownListItem {
  const meta = pick([
    formatStatusService(incident.service),
    formatStatusKind(incident.kind),
    opts?.hideIncidentPhase
      ? undefined
      : getStatusIncidentPhase(incident).label,
    formatStatusIncidentPeriodText(incident),
  ]);
  const excerpt = incident.excerpt ? inline(incident.excerpt) : undefined;
  const children: MarkdownPhrasingNode[] = [...incidentMarkdownLabel(incident)];

  if (meta.length > 0 || (!incident.hasPage && incident.sourceUrl)) {
    children.push(md.text(` — ${meta.join('; ')}`));

    if (!incident.hasPage && incident.sourceUrl) {
      children.push(
        md.text(meta.length > 0 ? '; ' : ''),
        sourceMarkdownLink(incident.sourceUrl),
      );
    }
  }

  return md.listItem([
    md.paragraph(children),
    ...(excerpt ? [md.paragraph(excerpt)] : []),
  ]);
}

function incidentSection(input: {
  readonly title: string;
  readonly items: readonly StatusIncident[];
  readonly empty: string;
  readonly intro?: string;
  readonly hideIncidentPhase?: boolean;
}): readonly MarkdownNode[] {
  const { title, items, empty, intro, hideIncidentPhase } = input;

  return [
    md.heading(2, title),
    ...(intro ? [md.paragraph(intro)] : []),
    md.list(
      items.length > 0
        ? items.map((incident) => incidentLine(incident, { hideIncidentPhase }))
        : [md.listItem(empty)],
    ),
  ];
}

const serviceLine = (summary: StatusServiceSummary): MarkdownListItem => {
  const latest = summary.incidents[0];

  return md.listItem([
    md.paragraph([
      md.link(
        abs(statusServiceMarkdownUrl(summary.service)),
        formatStatusService(summary.service),
      ),
      md.text(
        ` — ${formatStatusServiceState(summary.serviceStatus)}; последняя запись: `,
      ),
      ...(latest
        ? incidentMarkdownLabel(latest)
        : [md.text('пока без записей')]),
    ]),
  ]);
};

export function buildStatusHomeMarkdown(
  data: StatusDataset,
  opts?: {
    readonly now?: Date;
  },
): string {
  const now = opts?.now ?? new Date();
  const activeIncidents = data.active.filter(
    (item) => item.kind === 'incident',
  );
  const plannedWorks = data.incidents.filter(
    (item) =>
      item.kind === 'maintenance' &&
      (item.isActive || item.started.at.valueOf() > now.valueOf()),
  );

  return serialize([
    md.heading(1, 'Статус КП Шелково'),
    md.paragraph(
      'Текстовая сводка состояния сервисов КП Шелково: активные инциденты, плановые работы и история отключений.',
    ),
    ...section('Сервисы', data.services.map(serviceLine)),
    ...(activeIncidents.length > 0
      ? incidentSection({
          title: 'Активные инциденты',
          items: activeIncidents,
          empty: 'Сейчас нет активных инцидентов.',
          hideIncidentPhase: true,
        })
      : []),
    ...(plannedWorks.length > 0
      ? incidentSection({
          title: 'Плановые работы',
          items: plannedWorks,
          empty: 'Сейчас нет активных или запланированных работ.',
        })
      : []),
    ...incidentSection({
      title: 'История',
      items: data.incidents,
      empty: 'История пока пуста.',
    }),
  ]);
}

export function buildStatusServiceMarkdown(
  summary: StatusServiceSummary,
  opts?: {
    readonly now?: Date;
  },
): string {
  const now = opts?.now ?? new Date();
  const latest = summary.incidents[0];
  const plannedWorks = summary.incidents.filter(
    (item) =>
      item.kind === 'maintenance' &&
      (item.isActive || item.started.at.valueOf() > now.valueOf()),
  );
  const serviceLabel = formatStatusService(summary.service);

  return serialize([
    md.heading(1, `${serviceLabel} — статус Шелково`),
    ...section(
      'Сводка',
      pick([
        row('Сервис', serviceLabel),
        row('Текущий статус', formatStatusServiceState(summary.serviceStatus)),
        row(
          'Последняя запись',
          latest ? incidentMarkdownLabel(latest) : [md.text('нет записей')],
        ),
      ]),
    ),
    ...(summary.activeIncidents.length > 0
      ? incidentSection({
          title: 'Активные инциденты',
          items: summary.activeIncidents,
          empty: 'Сейчас нет активных инцидентов по этому сервису.',
          hideIncidentPhase: true,
        })
      : []),
    ...(plannedWorks.length > 0
      ? incidentSection({
          title: 'Плановые работы',
          items: plannedWorks,
          empty:
            'Сейчас нет активных или запланированных работ по этому сервису.',
        })
      : []),
    ...incidentSection({
      title: 'История',
      items: summary.incidents.slice(0, 10),
      empty: 'Пока без записей по этому сервису.',
      intro:
        summary.incidents.length > 10
          ? 'В Markdown-файле показаны 10 последних записей сервиса.'
          : undefined,
    }),
  ]);
}

export function buildStatusIncidentMarkdown(incident: StatusIncident): string {
  return serializeMarkdownDocument(
    createMarkdownDocument({
      frontmatter: incidentFrontmatter(incident),
      children: [
        md.heading(1, incident.title),
        ...(incident.body ? parseMarkdownFragment(incident.body.trim()) : []),
      ],
    }),
  );
}
