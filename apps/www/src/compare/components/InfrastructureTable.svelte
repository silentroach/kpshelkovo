<script lang="ts">
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
  let only = $state(false);

  type InfrastructureKey = keyof Infrastructure;
  type Display = { icon: string; text: string; tone: string };

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
  const roadConfig: Record<RoadType, Display> = {
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
  const drainageConfig: Record<DrainageType, Display> = {
    closed: { icon: '✓', text: 'Закрытая', tone: 'ui-badge-success' },
    open: { icon: '◐', text: 'Открытая', tone: 'ui-badge-warning' },
    none: { icon: '✗', text: 'Отсутствует', tone: 'ui-badge-danger' },
  };

  // Отображение типов видеонаблюдения.
  const videoConfig: Record<VideoSurveillance, Display> = {
    full: { icon: '✓', text: 'Есть', tone: 'ui-badge-success' },
    checkpointOnly: {
      icon: '◐',
      text: 'Только на КПП',
      tone: 'ui-badge-warning',
    },
    none: { icon: '✗', text: 'Нет', tone: 'ui-badge-danger' },
  };

  // Отображение типов подземной электросети.
  const electricityConfig: Record<UndergroundElectricity, Display> = {
    full: { icon: '✓', text: 'Полностью', tone: 'ui-badge-success' },
    partial: { icon: '◐', text: 'Частично', tone: 'ui-badge-warning' },
    none: { icon: '✗', text: 'По столбам', tone: 'ui-badge-danger' },
  };

  const unknown: Display = {
    icon: '?',
    text: 'Неизвестно',
    tone: 'ui-badge-muted',
  };

  const getFromConfig = <Value extends string>(
    value: Value | undefined,
    config: Record<Value, Display>,
  ): Display => (value === undefined ? unknown : config[value]);

  const getAvailabilityDisplay = (value?: AvailabilityStatus): Display =>
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
  ): Display {
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

  // Проверяем отличие поселка от Шелково.
  function hasDifference(key: InfrastructureKey): boolean {
    if (!shelkovoInfra) return false;
    return infra[key] !== shelkovoInfra[key];
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
    only && shelkovoInfra
      ? infraOrder.filter((key) => hasDifference(key))
      : infraOrder,
  );
</script>

<div>
  {#if title}
    <div class="mb-5 flex items-center justify-between gap-4">
      <h2 class="text-xl font-bold text-foreground">
        {title}
      </h2>
      {#if shelkovoInfra}
        <button
          type="button"
          data-testid="infra-diff-toggle"
          aria-pressed={only}
          aria-label={only
            ? 'Показать все свойства'
            : 'Показать только отличающиеся свойства'}
          title={only
            ? 'Показать все свойства'
            : 'Показать только отличающиеся свойства'}
          class={`ui-pill min-h-9 px-3 py-1.5 cursor-pointer text-sm font-semibold transition hover:opacity-90 active:opacity-80 ${only ? 'ui-pill-warning' : 'ui-pill-muted'}`}
          onclick={() => (only = !only)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="h-4 w-4"
          >
            <path
              d="M3 4.75A.75.75 0 0 1 3.75 4h12.5a.75.75 0 0 1 .57 1.238L12 10.84V15a.75.75 0 0 1-.352.636l-2.5 1.563A.75.75 0 0 1 8 16.563v-5.722L3.18 5.238A.75.75 0 0 1 3 4.75Z"
            />
          </svg>
        </button>
      {/if}
    </div>
  {/if}

  {#snippet badge(display: Display, tid?: string)}
    <span data-testid={tid} class="ui-badge {display.tone}">
      <span class="flex h-4 w-4 items-center justify-center"
        >{display.icon}</span
      >
      <span class="hidden sm:inline">{display.text}</span>
    </span>
  {/snippet}

  <!-- Фокус нужен, чтобы стрелками прокручивать таблицу. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="ui-sticky-table-shell ui-sticky-table-surface"
    data-ui-sticky-table-shell
    role="region"
    tabindex="0"
    aria-label={title ? `${title}: таблица сравнения` : 'Таблица сравнения'}
    style="--ui-sticky-table-min-width: 100%"
  >
    <table class="ui-table ui-sticky-table table-fixed">
      <thead>
        <tr class="ui-table-head ui-sticky-table-head">
          <th class="break-words">Инфраструктура</th>
          <th class="w-20 text-center sm:w-48">Статус</th>
          {#if shelkovoInfra}
            <th class="w-20 text-center sm:w-48">Шелково</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#if rows.length === 0}
          <tr class="ui-table-row">
            <td
              class="ui-table-cell text-center text-sm text-muted-foreground"
              colspan={shelkovoInfra ? 3 : 2}
            >
              Отличий с Шелково не найдено
            </td>
          </tr>
        {:else}
          {#each rows as key (key)}
            {@const display = getDisplayConfig(key, infra)}
            {@const shelkovoDisplay = shelkovoInfra
              ? getDisplayConfig(key, shelkovoInfra)
              : undefined}
            <tr data-testid="infra-row" class="ui-table-row">
              <td class="ui-table-cell break-words text-sm text-foreground">
                {labels[key]}
              </td>
              <td class="ui-table-cell ui-table-cell-center">
                {@render badge(display, 'infra-status')}
              </td>
              {#if shelkovoInfra && shelkovoDisplay}
                <td class="ui-table-cell ui-table-cell-center">
                  {@render badge(shelkovoDisplay, 'shelkovo-status')}
                </td>
              {/if}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
