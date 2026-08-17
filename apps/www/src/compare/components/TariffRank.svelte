<script lang="ts">
  type Tone = 'info' | 'success' | 'warning';

  interface Props {
    readonly rank: number;
    readonly base: number;
    readonly total: number;
    readonly tone: Tone;
  }

  let { rank, base, total, tone }: Props = $props();

  const count = $derived(Math.max(total, 1));
  const current = $derived(Math.min(Math.max(rank, 1), count));
  const marker = $derived(Math.min(Math.max(base, 1), count));
  const same = $derived(current === marker);
  const position = (value: number): number =>
    count === 1 ? 50 : ((value - 1) / (count - 1)) * 100;
  const currentPosition = $derived(position(current));
  const markerPosition = $derived(position(marker));
  const note = $derived.by(() => {
    if (same) return 'Базовый поселок';
    if (tone === 'success') return 'Дешевле базового';
    if (tone === 'warning') return 'Дороже базового';
    return 'На уровне базового';
  });

  const currentClass = $derived.by(() => {
    if (same) {
      return 'h-3 w-3 rounded-full border-2 border-info bg-[color:var(--color-surface)]';
    }

    if (tone === 'success') {
      return 'h-3 w-3 rounded-full border border-success bg-success';
    }

    if (tone === 'warning') {
      return 'h-3 w-3 rounded-full border border-warning-text bg-warning-text';
    }

    return 'h-3 w-3 rounded-full border border-info bg-info';
  });
</script>

<div
  data-testid="tariff-rank"
  class="min-w-0"
  role="img"
  aria-label={`Ранг ${current} из ${count}. ${note}.`}
>
  <div data-testid="tariff-rank-strip" class="relative mx-1.5 h-3">
    <div
      class="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border-strong/70"
      aria-hidden="true"
    ></div>

    {#if !same}
      <span
        data-testid="tariff-rank-base"
        class="pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-info/70 bg-[color:var(--color-surface)]"
        style={`left: ${markerPosition}%;`}
        aria-hidden="true"
      ></span>
    {/if}

    <span
      data-testid="tariff-rank-current"
      class="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 {currentClass}"
      style={`left: ${currentPosition}%;`}
      aria-hidden="true"
    ></span>
  </div>
</div>
