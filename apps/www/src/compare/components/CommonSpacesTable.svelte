<script lang="ts">
  import type { CommonSpaces } from '../lib/settlement/types';
  import { getAvailabilityDisplay } from './availability-status';
  import type { ComparisonTableRow } from './comparison-table.types';
  import ComparisonTable from './ComparisonTable.svelte';

  interface Props {
    title?: string;
    spaces: CommonSpaces;
    shelkovoSpaces?: CommonSpaces;
  }

  let { title = '', spaces, shelkovoSpaces }: Props = $props();

  type CommonSpaceKey = keyof CommonSpaces;

  const labels: Record<CommonSpaceKey, string> = {
    clubInfrastructure: 'Клубная инфраструктура',
    playgrounds: 'Детские площадки',
    sports: 'Спортивные площадки',
    pool: 'Бассейн',
    fitnessClub: 'Фитнес-клуб',
    restaurant: 'Ресторан',
    spaCenter: 'Спа-центр',
    walkingRoutes: 'Маршруты для прогулок',
    waterAccess: 'Выход к воде',
    beachZones: 'Пляжные зоны',
    kidsClub: 'Детский клуб',
    sportsCamp: 'Спортивный лагерь',
    primarySchool: 'Начальная школа',
    bbqZones: 'Зоны барбекю'
  };

  // Держим первым: это краткая сводка доступа ко многим пунктам ниже.
  const order = [
    'clubInfrastructure',
    'playgrounds',
    'sports',
    'pool',
    'fitnessClub',
    'restaurant',
    'spaCenter',
    'walkingRoutes',
    'waterAccess',
    'beachZones',
    'kidsClub',
    'sportsCamp',
    'primarySchool',
    'bbqZones'
  ] as const satisfies readonly CommonSpaceKey[];

  const rows = $derived(
    order.map((key): ComparisonTableRow => ({
      key,
      label: labels[key],
      value: spaces[key],
      shelkovoValue: shelkovoSpaces?.[key],
      status: getAvailabilityDisplay(spaces[key]),
      shelkovoStatus: getAvailabilityDisplay(shelkovoSpaces?.[key])
    }))
  );
</script>

<ComparisonTable
  {title}
  itemHeading="Общие пространства"
  {rows}
  showShelkovo={shelkovoSpaces !== undefined}
/>
