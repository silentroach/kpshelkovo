<script lang="ts">
  import ComparisonTable from './ComparisonTable.svelte';
  import type {
    ComparisonStatus,
    ComparisonTableRow,
  } from './comparison-table.types';
  import type {
    ServiceModel,
    AvailabilityStatus,
  } from '../lib/settlement/types';

  interface Props {
    title?: string;
    services: ServiceModel;
    shelkovoServices?: ServiceModel;
  }

  let { title = '', services, shelkovoServices }: Props = $props();

  type ServiceKey = keyof ServiceModel;

  // Русские подписи услуг.
  const labels: Record<ServiceKey, string> = {
    garbageCollection: 'Вывоз мусора',
    snowRemoval: 'Уборка снега',
    roadCleaning: 'Уборка дорог',
    landscaping: 'Благоустройство',
    emergencyService: 'Аварийная служба',
    dispatcher: 'Диспетчерская служба',
  };

  // Иконки статусов.
  const icons: Record<AvailabilityStatus, string> = {
    yes: '✓',
    no: '✗',
    partial: '◐',
  };

  // Цвета бейджей статусов.
  const tones: Record<AvailabilityStatus, string> = {
    yes: 'ui-badge-success',
    no: 'ui-badge-danger',
    partial: 'ui-badge-warning',
  };

  // Текст статуса.
  const statusText: Record<AvailabilityStatus, string> = {
    yes: 'Есть',
    no: 'Нет',
    partial: 'Частично',
  };

  const unknown: ComparisonStatus = {
    icon: '?',
    text: 'Неизвестно',
    tone: 'ui-badge-muted',
  };

  function getDisplay(value?: AvailabilityStatus): ComparisonStatus {
    if (value === undefined) return unknown;

    return {
      icon: icons[value],
      text: statusText[value],
      tone: tones[value],
    };
  }

  // Порядок отображения услуг.
  const serviceOrder = [
    'garbageCollection',
    'snowRemoval',
    'roadCleaning',
    'landscaping',
    'emergencyService',
    'dispatcher',
  ] as const satisfies readonly ServiceKey[];

  const rows = $derived(
    serviceOrder.map((key): ComparisonTableRow => ({
      key,
      label: labels[key],
      value: services[key],
      shelkovoValue: shelkovoServices?.[key],
      status: getDisplay(services[key]),
      shelkovoStatus: getDisplay(shelkovoServices?.[key]),
    })),
  );
</script>

<ComparisonTable
  {title}
  itemHeading="Услуга"
  {rows}
  showShelkovo={shelkovoServices !== undefined}
/>
