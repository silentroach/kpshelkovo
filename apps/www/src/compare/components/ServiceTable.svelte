<script lang="ts">
  import type { ServiceModel } from '../lib/settlement/types';
  import { getAvailabilityDisplay } from './availability-status';
  import type { ComparisonTableRow } from './comparison-table.types';
  import ComparisonTable from './ComparisonTable.svelte';

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
    dispatcher: 'Диспетчерская служба'
  };

  // Порядок отображения услуг.
  const serviceOrder = [
    'garbageCollection',
    'snowRemoval',
    'roadCleaning',
    'landscaping',
    'emergencyService',
    'dispatcher'
  ] as const satisfies readonly ServiceKey[];

  const rows = $derived(
    serviceOrder.map((key): ComparisonTableRow => ({
      key,
      label: labels[key],
      value: services[key],
      shelkovoValue: shelkovoServices?.[key],
      status: getAvailabilityDisplay(services[key]),
      shelkovoStatus: getAvailabilityDisplay(shelkovoServices?.[key])
    }))
  );
</script>

<ComparisonTable
  {title}
  itemHeading="Услуга"
  {rows}
  showShelkovo={shelkovoServices !== undefined}
/>
