import type { AvailabilityStatus } from '../lib/settlement/types';
import type { ComparisonStatus } from './comparison-table.types';

const displayByStatus = {
  yes: { icon: '✓', text: 'Есть', tone: 'ui-badge-success' },
  no: { icon: '✗', text: 'Нет', tone: 'ui-badge-danger' },
  partial: { icon: '◐', text: 'Частично', tone: 'ui-badge-warning' },
} satisfies Readonly<Record<AvailabilityStatus, ComparisonStatus>>;

const unknownDisplay: ComparisonStatus = {
  icon: '?',
  text: 'Неизвестно',
  tone: 'ui-badge-muted',
};

export const getAvailabilityDisplay = (
  status?: AvailabilityStatus,
): ComparisonStatus => (status ? displayByStatus[status] : unknownDisplay);
