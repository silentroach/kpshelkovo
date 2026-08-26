<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    subtitle?: string;
    subtitleLinkHref?: string;
    subtitleLinkText?: string;
    children?: Snippet;
  }

  let {
    title,
    subtitle = 'Сравнивайте стоимость обслуживания и качество инфраструктуры по одинаковой шкале, чтобы принимать решения на данных, а не на обещаниях.',
    subtitleLinkHref,
    subtitleLinkText,
    children,
  }: Props = $props();
</script>

<div
  class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)] lg:items-end"
>
  <div class="space-y-3">
    <h1 class="ui-page-title max-w-3xl">
      {title}
    </h1>
    <p class="ui-copy max-w-3xl text-muted-foreground">
      {subtitle}
      {#if subtitleLinkHref && subtitleLinkText}
        <a
          href={subtitleLinkHref}
          class="ui-link font-semibold underline decoration-border underline-offset-4"
        >
          {subtitleLinkText}
        </a>
      {/if}
    </p>
  </div>

  {#if children}
    <div
      class="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
    >
      {@render children()}
    </div>
  {/if}
</div>
