import type { StatusServiceState } from './schema';

const SERVICE_STATE_LABELS = {
  green: 'В норме',
  amber: 'Работы',
  red: 'Инцидент',
} satisfies Readonly<Record<StatusServiceState, string>>;

export const formatStatusServiceState = (state: StatusServiceState): string =>
  SERVICE_STATE_LABELS[state];
