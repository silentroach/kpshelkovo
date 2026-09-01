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
    <div class="table-header">
      <h2 class="table-title">
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
          class={`ui-pill filter-toggle ${showOnlyDifferences ? 'ui-pill-warning' : 'ui-pill-muted'}`}
          onclick={() => (showOnlyDifferences = !showOnlyDifferences)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="filter-icon"
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
      <span class="status-icon">{status.icon}</span>
      <span class="status-text">{status.text}</span>
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
    <table class="ui-table ui-sticky-table comparison-grid">
      <thead>
        <tr class="ui-table-head ui-sticky-table-head">
          <th class="item-heading">{itemHeading}</th>
          <th class="status-column">Статус</th>
          {#if showShelkovo}
            <th class="status-column">Шелково</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#if visibleRows.length === 0}
          <tr class="ui-table-row">
            <td
              class="ui-table-cell empty-state"
              colspan={showShelkovo ? 3 : 2}
            >
              Отличий с Шелково не найдено
            </td>
          </tr>
        {:else}
          {#each visibleRows as row (row.key)}
            <tr class="ui-table-row">
              <td class="ui-table-cell item-cell">
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

<style>
  .table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .table-title {
    color: var(--color-text);
    font-size: 1.25rem;
    line-height: 1.75rem;
  }

  .filter-toggle {
    min-height: 2.25rem;
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.25rem;
    cursor: pointer;
    transition: opacity 0.1s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .filter-toggle:not(:disabled):hover {
    opacity: 0.9;
  }

  .filter-toggle:not(:disabled):active {
    opacity: 0.8;
  }

  .filter-toggle:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .filter-icon,
  .status-icon {
    width: 1rem;
    height: 1rem;
  }

  .status-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .status-text {
    display: none;
  }

  .comparison-grid {
    table-layout: fixed;
  }

  .item-heading,
  .item-cell {
    overflow-wrap: break-word;
  }

  .status-column {
    width: 5rem;
    text-align: center;
  }

  .empty-state {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    line-height: 1.25rem;
    text-align: center;
  }

  .item-cell {
    color: var(--color-text);
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  @media (min-width: 40rem) {
    .status-text {
      display: inline;
    }

    .status-column {
      width: 12rem;
    }
  }
</style>
