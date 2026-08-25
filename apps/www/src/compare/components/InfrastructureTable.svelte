<script lang="ts">
  import ComparisonTable from './ComparisonTable.svelte';
  import type {
    ComparisonStatus,
    ComparisonTableRow,
  } from './comparison-table.types';
  import type {
    Infrastructure,
    AvailabilityStatus,
    RoadType,
    DrainageType,
    VideoSurveillance,
    UndergroundElectricity,
  } from '../lib/settlement/types';

  interface Props {
    title?: string;
    infra: Infrastructure;
    shelkovoInfra?: Infrastructure;
  }

  let { title = '', infra, shelkovoInfra }: Props = $props();

  type InfrastructureKey = keyof Infrastructure;

  // Русские подписи инфраструктуры.
  const labels: Record<InfrastructureKey, string> = {
    roads: 'Дороги',
    sidewalks: 'Тротуары',
    lighting: 'Уличное освещение',
    gas: 'Газ',
    water: 'Центральное водоснабжение',
    sewage: 'Центральная канализация',
    drainage: 'Ливневка',
    checkpoints: 'КПП',
    security: 'Охрана',
    fencing: 'Закрытая территория',
    videoSurveillance: 'Видеонаблюдение',
    undergroundElectricity: 'Подземная электросеть',
    adminBuilding: 'Административное здание',
    retailOrServices: 'Магазины',
  };

  // Иконки базовых статусов.
  const icons: Record<AvailabilityStatus, string> = {
    yes: '✓',
    no: '✗',
    partial: '◐',
  };

  // Цвета бейджей базовых статусов.
  const tones: Record<AvailabilityStatus, string> = {
    yes: 'ui-badge-success',
    no: 'ui-badge-danger',
    partial: 'ui-badge-warning',
  };

  // Текст базовых статусов.
  const statusText: Record<AvailabilityStatus, string> = {
    yes: 'Есть',
    no: 'Нет',
    partial: 'Частично',
  };

  // Отображение типов дорог.
  const roadConfig: Record<RoadType, ComparisonStatus> = {
    asphalt: { icon: '●', text: 'Асфальт', tone: 'ui-badge-success' },
    partlyAsphalt: {
      icon: '◐',
      text: 'Частично асфальт',
      tone: 'ui-badge-warning',
    },
    gravel: { icon: '○', text: 'Крошка', tone: 'ui-badge-warning' },
    dirt: { icon: '✗', text: 'Грунт', tone: 'ui-badge-danger' },
  };

  // Отображение типов ливневки.
  const drainageConfig: Record<DrainageType, ComparisonStatus> = {
    closed: { icon: '✓', text: 'Закрытая', tone: 'ui-badge-success' },
    open: { icon: '◐', text: 'Открытая', tone: 'ui-badge-warning' },
    none: { icon: '✗', text: 'Отсутствует', tone: 'ui-badge-danger' },
  };

  // Отображение типов видеонаблюдения.
  const videoConfig: Record<VideoSurveillance, ComparisonStatus> = {
    full: { icon: '✓', text: 'Есть', tone: 'ui-badge-success' },
    checkpointOnly: {
      icon: '◐',
      text: 'Только на КПП',
      tone: 'ui-badge-warning',
    },
    none: { icon: '✗', text: 'Нет', tone: 'ui-badge-danger' },
  };

  // Отображение типов подземной электросети.
  const electricityConfig: Record<UndergroundElectricity, ComparisonStatus> = {
    full: { icon: '✓', text: 'Полностью', tone: 'ui-badge-success' },
    partial: { icon: '◐', text: 'Частично', tone: 'ui-badge-warning' },
    none: { icon: '✗', text: 'По столбам', tone: 'ui-badge-danger' },
  };

  const unknown: ComparisonStatus = {
    icon: '?',
    text: 'Неизвестно',
    tone: 'ui-badge-muted',
  };

  const getFromConfig = <Value extends string>(
    value: Value | undefined,
    config: Record<Value, ComparisonStatus>,
  ): ComparisonStatus => (value === undefined ? unknown : config[value]);

  const getAvailabilityDisplay = (
    value?: AvailabilityStatus,
  ): ComparisonStatus =>
    value === undefined
      ? unknown
      : {
          icon: icons[value],
          text: statusText[value],
          tone: tones[value],
        };

  // Подбираем отображение по конкретному ключу инфраструктуры.
  function getDisplayConfig(
    key: InfrastructureKey,
    source: Infrastructure,
  ): ComparisonStatus {
    switch (key) {
      case 'roads':
        return getFromConfig(source.roads, roadConfig);
      case 'drainage':
        return getFromConfig(source.drainage, drainageConfig);
      case 'videoSurveillance':
        return getFromConfig(source.videoSurveillance, videoConfig);
      case 'undergroundElectricity':
        return getFromConfig(source.undergroundElectricity, electricityConfig);
      default:
        return getAvailabilityDisplay(source[key]);
    }
  }

  // Порядок отображения инфраструктуры.
  const infraOrder = [
    'roads',
    'sidewalks',
    'lighting',
    'gas',
    'water',
    'sewage',
    'drainage',
    'checkpoints',
    'security',
    'fencing',
    'videoSurveillance',
    'undergroundElectricity',
    'adminBuilding',
    'retailOrServices',
  ] as const satisfies readonly InfrastructureKey[];

  const rows = $derived(
    infraOrder.map((key): ComparisonTableRow => ({
      key,
      label: labels[key],
      value: infra[key],
      shelkovoValue: shelkovoInfra?.[key],
      status: getDisplayConfig(key, infra),
      shelkovoStatus: getDisplayConfig(key, shelkovoInfra ?? {}),
    })),
  );
</script>

<ComparisonTable
  {title}
  itemHeading="Инфраструктура"
  {rows}
  showShelkovo={shelkovoInfra !== undefined}
/>
