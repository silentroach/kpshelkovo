<script lang="ts">
  import ComparisonTable from './ComparisonTable.svelte';
  import type {
    ComparisonStatus,
    ComparisonTableRow,
  } from './comparison-table.types';
  import type {
    CommonSpaces,
    AvailabilityStatus,
  } from '../lib/settlement/types';

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
    bbqZones: 'Зоны барбекю',
  };

  const icons: Record<AvailabilityStatus, string> = {
    yes: '✓',
    no: '✗',
    partial: '◐',
  };

  const tones: Record<AvailabilityStatus, string> = {
    yes: 'ui-badge-success',
    no: 'ui-badge-danger',
    partial: 'ui-badge-warning',
  };

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
    'bbqZones',
  ] as const satisfies readonly CommonSpaceKey[];

  const rows = $derived(
    order.map((key): ComparisonTableRow => ({
      key,
      label: labels[key],
      status: getDisplay(spaces[key]),
      shelkovoStatus: getDisplay(shelkovoSpaces?.[key]),
      differs: shelkovoSpaces ? spaces[key] !== shelkovoSpaces[key] : false,
    })),
  );
</script>

<ComparisonTable
  {title}
  itemHeading="Общие пространства"
  {rows}
  showShelkovo={shelkovoSpaces !== undefined}
/>
