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

<article
  data-testid="settlement-card"
  class="ui-shell compare-settlement-card grid min-h-full grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 md:flex md:flex-col md:p-5"
>
  <div class="min-w-0 md:flex md:items-start md:justify-between md:gap-3">
    <div class="min-w-0 space-y-1">
      <h3 class="text-base leading-tight text-foreground md:text-xl">
        <Link
          href={withBase(`settlements/${settlement.slug}/`)}
          class="ui-link"
        >
          {settlement.shortName}
        </Link>
      </h3>
      <p class="text-sm leading-snug text-muted-foreground">
        {settlement.location.district}
      </p>
    </div>
    <div
      class="mt-1.5 flex flex-wrap items-center gap-1.5 md:mt-0 md:shrink-0 md:justify-end md:text-right"
    >
      {#if settlement.rabstvo}
        <a
          href="https://t.me/obmandachniki"
          target="_blank"
          rel="noopener noreferrer"
          class="ui-badge ui-badge-danger h-6 px-2 text-[11px] leading-none transition-colors hover:border-danger hover:bg-danger hover:text-danger-foreground"
          title="Открыть канал Коттеджное рабство"
          data-testid="rabstvo-badge"
        >
          рабство
        </a>
      {/if}
      {#if isBaseline}
        <span class="ui-badge ui-badge-info h-6 px-2 text-[11px] leading-none"
          >наш</span
        >
      {/if}
      <p
        class="ui-num inline-flex h-6 items-center text-xs font-semibold leading-none text-muted-foreground"
        data-testid="tariff-rank-label"
        title="Ранг по возрастанию тарифа (1 — самый дешевый)"
      >
        {rank} / {total}
      </p>
    </div>
  </div>

  <div class="text-right md:mt-auto md:pt-1 md:text-left">
    <div
      class="flex flex-col items-end gap-1 md:flex-row md:flex-wrap md:items-baseline md:justify-between md:gap-x-4 md:gap-y-1.5"
    >
      <span
        class="ui-num whitespace-nowrap text-xl font-semibold leading-none text-foreground md:text-2xl"
        title={tariffHint}
      >
        {tariffText}
      </span>
      {#if !isBaseline && comparison && comparison.tariffDelta !== 0}
        {#if comparison.isCheaper}
          <span
            class="ui-num max-w-[9rem] text-right text-sm font-semibold leading-tight ui-delta-success"
          >
            дешевле на {formatCurrency(Math.abs(comparison.tariffDelta))}
          </span>
        {:else}
          <span
            class="ui-num max-w-[9rem] text-right text-sm font-semibold leading-tight ui-delta-warning"
          >
            дороже на {formatCurrency(Math.abs(comparison.tariffDelta))}
          </span>
        {/if}
      {:else if isBaseline}
        <span class="text-sm font-semibold text-muted-foreground"
          >базовый тариф</span
        >
      {/if}
    </div>
  </div>
</article>

<style>
  @media (min-width: 48rem) {
    .compare-settlement-card {
      border: 1px solid var(--color-border);
      background: var(--color-surface);
    }
  }
</style>
