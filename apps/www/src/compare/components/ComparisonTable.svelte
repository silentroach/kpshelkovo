<script lang="ts">
  import type {
    ComparisonStatus,
    ComparisonTableProps,
  } from './comparison-table.types';

  let {
    title = '',
    itemHeading,
    rows,
    showShelkovo,
  }: ComparisonTableProps = $props();
  let showOnlyDifferences = $state(false);

  const visibleRows = $derived(
    showOnlyDifferences && showShelkovo
      ? rows.filter((row) => row.value !== row.shelkovoValue)
      : rows,
  );
</script>

<div>
  {#if title}
    <div class="mb-5 flex items-center justify-between gap-4">
      <h2 class="text-xl font-bold text-foreground">
        {title}
      </h2>
      {#if showShelkovo}
        <button
          type="button"
          aria-pressed={showOnlyDifferences}
          aria-label={showOnlyDifferences
            ? 'Показать все свойства'
            : 'Показать только отличающиеся свойства'}
          title={showOnlyDifferences
            ? 'Показать все свойства'
            : 'Показать только отличающиеся свойства'}
          class={`ui-pill min-h-9 px-3 py-1.5 cursor-pointer text-sm font-semibold transition hover:opacity-90 active:opacity-80 ${showOnlyDifferences ? 'ui-pill-warning' : 'ui-pill-muted'}`}
          onclick={() => (showOnlyDifferences = !showOnlyDifferences)}
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

  {#snippet badge(status: ComparisonStatus)}
    <span class="ui-badge {status.tone}">
      <span class="flex h-4 w-4 items-center justify-center">{status.icon}</span
      >
      <span class="hidden sm:inline">{status.text}</span>
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
          <th class="break-words">{itemHeading}</th>
          <th class="w-20 text-center sm:w-48">Статус</th>
          {#if showShelkovo}
            <th class="w-20 text-center sm:w-48">Шелково</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#if visibleRows.length === 0}
          <tr class="ui-table-row">
            <td
              class="ui-table-cell text-center text-sm text-muted-foreground"
              colspan={showShelkovo ? 3 : 2}
            >
              Отличий с Шелково не найдено
            </td>
          </tr>
        {:else}
          {#each visibleRows as row (row.key)}
            <tr class="ui-table-row">
              <td class="ui-table-cell break-words text-sm text-foreground">
                {row.label}
              </td>
              <td class="ui-table-cell ui-table-cell-center">
                {@render badge(row.status)}
              </td>
              {#if showShelkovo}
                <td class="ui-table-cell ui-table-cell-center">
                  {@render badge(row.shelkovoStatus)}
                </td>
              {/if}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
