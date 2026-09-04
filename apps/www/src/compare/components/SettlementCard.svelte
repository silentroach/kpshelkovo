<script lang="ts">
  import { formatCurrency, formatTariff } from '@shelkovo/format';
  import Link from '@shelkovo/ui/Link.svelte';
  import type { ExplorerSettlement } from '../lib/explorer';
  import type { ComparisonResult } from '../lib/settlement/types';
  import { withBase } from '../lib/url';

  interface Props {
    readonly settlement: ExplorerSettlement;
    readonly comparison?: ComparisonResult;
    readonly rank: number;
    readonly total: number;
    readonly isBaseline: boolean;
  }

  let { settlement, comparison, rank, total, isBaseline }: Props = $props();

  const tariffText = $derived.by(() => {
    const text = formatTariff(settlement.tariff.normalizedPerSotkaMonth);
    return settlement.tariff.normalizedIsEstimate ? `~${text}` : text;
  });

  const tariffHint = $derived(
    settlement.tariff.normalizedIsEstimate
      ? 'Тариф приведен к сотке автоматически.'
      : undefined,
  );
</script>

<article data-testid="settlement-card" class="ui-shell compare-settlement-card">
  <div class="settlement-header">
    <div class="settlement-identity">
      <h3 class="settlement-title">
        <Link
          href={withBase(`settlements/${settlement.slug}/`)}
          class="ui-link"
        >
          {settlement.shortName}
        </Link>
      </h3>
      <p class="settlement-location">
        {settlement.location.district}
      </p>
    </div>
    <div class="settlement-meta">
      {#if settlement.rabstvo}
        <a
          href="https://t.me/obmandachniki"
          target="_blank"
          rel="noopener noreferrer"
          class="ui-badge ui-badge-danger settlement-badge rabstvo-badge"
          title="Открыть канал Коттеджное рабство"
          data-testid="rabstvo-badge"
        >
          рабство
        </a>
      {/if}
      {#if isBaseline}
        <span class="ui-badge ui-badge-info settlement-badge">наш</span>
      {/if}
      <p
        class="ui-num tariff-rank"
        data-testid="tariff-rank-label"
        title="Ранг по возрастанию тарифа (1 — самый дешевый)"
      >
        {rank} / {total}
      </p>
    </div>
  </div>

  <div class="tariff-summary">
    <div class="tariff-row">
      <span class="ui-num tariff" title={tariffHint}>
        {tariffText}
      </span>
      {#if !isBaseline && comparison && comparison.tariffDelta !== 0}
        {#if comparison.isCheaper}
          <span class="ui-num tariff-delta ui-delta-success">
            дешевле на {formatCurrency(Math.abs(comparison.tariffDelta))}
          </span>
        {:else}
          <span class="ui-num tariff-delta ui-delta-warning">
            дороже на {formatCurrency(Math.abs(comparison.tariffDelta))}
          </span>
        {/if}
      {:else if isBaseline}
        <span class="baseline-label">базовый тариф</span>
      {/if}
    </div>
  </div>
</article>

<style>
  .compare-settlement-card {
    display: grid;
    min-height: 100%;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    padding-block: 0.75rem;
  }

  .settlement-header,
  .settlement-identity {
    min-width: 0;
  }

  .settlement-identity {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .settlement-title {
    color: var(--color-text);
    font-size: 1rem;
    line-height: 1.25;
  }

  .settlement-location {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    line-height: 1.375;
  }

  .settlement-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.375rem;
  }

  .settlement-badge {
    height: 1.5rem;
    padding-inline: 0.5rem;
    font-size: 0.6875rem;
    line-height: 1;
  }

  .rabstvo-badge {
    transition-duration: 150ms;
    transition-property: color, background-color, border-color;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  .rabstvo-badge:hover {
    border-color: var(--color-danger);
    background: var(--color-danger);
    color: var(--color-danger-foreground);
  }

  .tariff-rank {
    display: inline-flex;
    height: 1.5rem;
    align-items: center;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1;
  }

  .tariff-summary {
    text-align: right;
  }

  .tariff-row {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .tariff {
    color: var(--color-text);
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
  }

  .tariff-delta {
    max-width: 9rem;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.25;
    text-align: right;
  }

  .baseline-label {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    font-weight: 600;
  }

  @media (min-width: 48rem) {
    .compare-settlement-card {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      padding: 1.25rem;
    }

    .settlement-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .settlement-title {
      font-size: 1.25rem;
    }

    .settlement-meta {
      flex-shrink: 0;
      justify-content: flex-end;
      margin-top: 0;
      text-align: right;
    }

    .tariff-summary {
      margin-top: auto;
      padding-top: 0.25rem;
      text-align: left;
    }

    .tariff-row {
      flex-flow: row wrap;
      align-items: baseline;
      justify-content: space-between;
      column-gap: 1rem;
      row-gap: 0.375rem;
    }

    .tariff {
      font-size: 1.5rem;
    }
  }
</style>
