<script lang="ts">
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
  let only = $state(false);

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

  const unknown = {
    icon: '?',
    text: 'Неизвестно',
    tone: 'ui-badge-muted',
  };

  function getDisplay(value?: AvailabilityStatus): {
    icon: string;
    text: string;
    tone: string;
  } {
    if (value === undefined) return unknown;

    return {
      icon: icons[value],
      text: statusText[value],
      tone: tones[value],
    };
  }

  type Display = { icon: string; text: string; tone: string };

  function hasDifference(key: CommonSpaceKey): boolean {
    if (!shelkovoSpaces) return false;
    return spaces[key] !== shelkovoSpaces[key];
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
    only && shelkovoSpaces ? order.filter((key) => hasDifference(key)) : order,
  );
</script>

<div>
  {#if title}
    <div class="mb-5 flex items-center justify-between gap-4">
      <h2 class="text-xl font-bold text-foreground">
        {title}
      </h2>
      {#if shelkovoSpaces}
        <button
          type="button"
          data-testid="spaces-diff-toggle"
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
          <th class="break-words">Общие пространства</th>
          <th class="w-20 text-center sm:w-48">Статус</th>
          {#if shelkovoSpaces}
            <th class="w-20 text-center sm:w-48">Шелково</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#if rows.length === 0}
          <tr class="ui-table-row">
            <td
              class="ui-table-cell text-center text-sm text-muted-foreground"
              colspan={shelkovoSpaces ? 3 : 2}
            >
              Отличий с Шелково не найдено
            </td>
          </tr>
        {:else}
          {#each rows as key (key)}
            {@const value = spaces[key]}
            {@const shelkovoValue = shelkovoSpaces?.[key]}
            {@const display = getDisplay(value)}
            {@const shelkovoDisplay = shelkovoSpaces
              ? getDisplay(shelkovoValue)
              : undefined}
            <tr data-testid="space-row" class="ui-table-row">
              <td class="ui-table-cell break-words text-sm text-foreground">
                {labels[key]}
              </td>
              <td class="ui-table-cell ui-table-cell-center">
                {@render badge(display, 'space-status')}
              </td>
              {#if shelkovoSpaces && shelkovoDisplay}
                <td class="ui-table-cell ui-table-cell-center">
                  {@render badge(shelkovoDisplay, 'shelkovo-space-status')}
                </td>
              {/if}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
