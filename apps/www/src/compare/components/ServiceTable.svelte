<script lang="ts">
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
  let only = $state(false);

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

  // Проверяем отличие поселка от Шелково.
  function hasDifference(key: ServiceKey): boolean {
    if (!shelkovoServices) return false;
    return services[key] !== shelkovoServices[key];
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
    only && shelkovoServices
      ? serviceOrder.filter((key) => hasDifference(key))
      : serviceOrder,
  );
</script>

<div>
  {#if title}
    <div class="mb-5 flex items-center justify-between gap-4">
      <h2 class="text-xl font-bold text-foreground">
        {title}
      </h2>
      {#if shelkovoServices}
        <button
          type="button"
          data-testid="service-diff-toggle"
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
          <th class="break-words">Услуга</th>
          <th class="w-20 text-center sm:w-48">Статус</th>
          {#if shelkovoServices}
            <th class="w-20 text-center sm:w-48">Шелково</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#if rows.length === 0}
          <tr class="ui-table-row">
            <td
              class="ui-table-cell text-center text-sm text-muted-foreground"
              colspan={shelkovoServices ? 3 : 2}
            >
              Отличий с Шелково не найдено
            </td>
          </tr>
        {:else}
          {#each rows as key (key)}
            {@const value = services[key]}
            {@const shelkovoValue = shelkovoServices?.[key]}
            {@const display = getDisplay(value)}
            {@const shelkovoDisplay = shelkovoServices
              ? getDisplay(shelkovoValue)
              : undefined}
            <tr data-testid="service-row" class="ui-table-row">
              <td class="ui-table-cell break-words text-sm text-foreground">
                {labels[key]}
              </td>
              <td class="ui-table-cell ui-table-cell-center">
                {@render badge(display, 'service-status')}
              </td>
              {#if shelkovoServices && shelkovoDisplay}
                <td class="ui-table-cell ui-table-cell-center">
                  {@render badge(shelkovoDisplay, 'shelkovo-service-status')}
                </td>
              {/if}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
