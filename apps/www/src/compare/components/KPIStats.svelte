<script lang="ts">
  import { formatPercentage, formatTariff } from '@shelkovo/format';

  import type { Stats } from '../lib/settlement/types';

  interface Props {
    stats: Stats;
    embed?: boolean;
  }

  let { stats, embed = false }: Props = $props();

  function getDeltaText(diff: number): string {
    if (diff === 0) return 'на уровне Шелково';
    return `Шелково: ${formatPercentage(diff / 100)}`;
  }

  function getMedianTone(diff: number): string {
    if (diff > 0) return 'danger';
    if (diff < 0) return 'success';
    return 'muted';
  }
</script>

<section
  class:embedded={embed}
  class:standalone={!embed}
  class:ui-shell={!embed}
  class="kpi-stats"
  data-testid="kpi-stats"
>
  {#if !embed}
    <div class="stats-header">
      <h2 class="stats-title" data-testid="kpi-stats-title">
        Ключевые показатели
      </h2>
      <p class="stats-context">по текущему набору поселков</p>
    </div>
  {/if}

  <div class="stats-grid">
    <article class="metric metric-peer" data-testid="kpi-median">
      <div>
        <div class="metric-label">Похожие по уровню</div>
        <div class="metric-description">медиана тарифа</div>
      </div>
      <div class="metric-result">
        <div class="ui-num metric-value" data-testid="kpi-peer-median">
          {formatTariff(stats.peerMedianTariff)}
        </div>
        <div
          class={`ui-num metric-delta ${getMedianTone(stats.shelkovoVsPeerMedianPercent)}`}
        >
          {getDeltaText(stats.shelkovoVsPeerMedianPercent)}
        </div>
      </div>
    </article>

    <article class="metric metric-all" data-testid="kpi-all-median">
      <div>
        <div class="metric-label">Все поселки на сайте</div>
        <div class="metric-description">общая медиана тарифа</div>
      </div>
      <div class="metric-result">
        <div class="ui-num metric-value">
          {formatTariff(stats.medianTariff)}
        </div>
        <div
          class={`ui-num metric-delta ${getMedianTone(stats.shelkovoVsMedianPercent)}`}
        >
          {getDeltaText(stats.shelkovoVsMedianPercent)}
        </div>
      </div>
    </article>
  </div>
</section>

<style>
  .kpi-stats {
    color: var(--color-text);
  }

  .embedded {
    max-width: 48rem;
    font-size: 0.875rem;
  }

  .standalone {
    padding: 1rem;
  }

  .stats-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .stats-title {
    color: var(--color-text-muted);
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.025em;
    line-height: 1.25rem;
    text-transform: uppercase;
  }

  .stats-context {
    color: var(--color-text-muted);
    font-size: 0.75rem;
    line-height: 1rem;
  }

  .stats-grid {
    display: grid;
  }

  .standalone .stats-grid {
    grid-template-columns: minmax(0, 1fr);
    border-block: 1px solid var(--color-border);
  }

  .metric {
    padding-block: 1rem;
  }

  .embedded .metric {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding-block: 0.75rem;
  }

  .metric-all {
    border-top: 1px solid var(--color-border);
  }

  .metric-label {
    margin-bottom: 0.5rem;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    line-height: 1rem;
    text-transform: uppercase;
  }

  .embedded .metric-label {
    margin-bottom: 0;
    font-size: 0.6875rem;
  }

  .metric-description {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .embedded .metric-description {
    font-size: 0.75rem;
    line-height: 1rem;
  }

  .embedded .metric-result {
    text-align: right;
  }

  .metric-value {
    margin-bottom: 0.25rem;
    color: var(--color-text);
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 2rem;
  }

  .embedded .metric-value {
    margin-bottom: 0;
    font-size: 1rem;
    line-height: 1.25;
  }

  .metric-delta {
    margin-top: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .embedded .metric-delta {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    line-height: 1.25;
  }

  .danger {
    color: var(--color-danger-text);
  }

  .success {
    color: var(--color-success-text);
  }

  .muted {
    color: var(--color-text-muted);
  }

  @media (min-width: 40rem) {
    .standalone .stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .standalone .metric-peer {
      padding-right: 1rem;
    }

    .standalone .metric-all {
      border-top: 0;
      border-left: 1px solid var(--color-border);
      padding-left: 1rem;
    }
  }

  @media (min-width: 48rem) {
    .standalone {
      padding: 1.25rem;
    }

    .embedded .stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .embedded .metric {
      display: block;
      padding-block: 0;
    }

    .embedded .metric-peer {
      padding-right: 1rem;
    }

    .embedded .metric-all {
      border-top: 0;
      border-left: 1px solid var(--color-border);
      padding-left: 1rem;
    }

    .embedded .metric-label {
      margin-bottom: 0.5rem;
    }

    .embedded .metric-result {
      text-align: left;
    }

    .embedded .metric-value {
      margin-bottom: 0.125rem;
      font-size: 1.125rem;
      line-height: 1.75rem;
    }
  }
</style>
