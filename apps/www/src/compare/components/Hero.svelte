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

<div class="hero">
  <div>
    <h1 class="ui-page-title hero-title">
      {title}
    </h1>
    <p class="ui-copy hero-subtitle">
      {subtitle}
      {#if subtitleLinkHref && subtitleLinkText}
        <a href={subtitleLinkHref} class="ui-link hero-link">
          {subtitleLinkText}
        </a>
      {/if}
    </p>
  </div>

  {#if children}
    <div class="hero-aside">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .hero {
    display: grid;
    gap: 1.25rem;
  }

  .hero-title,
  .hero-subtitle {
    max-width: 48rem;
  }

  .hero-title {
    margin-bottom: 0.75rem;
  }

  .hero-subtitle {
    color: var(--color-text-muted);
  }

  .hero-link {
    font-weight: 600;
  }

  .hero-aside {
    border-top: 1px solid var(--color-border);
    padding-top: 1rem;
  }

  @media (min-width: 64rem) {
    .hero {
      grid-template-columns: minmax(0, 1fr) minmax(18rem, 28rem);
      align-items: end;
    }

    .hero-aside {
      border-top: 0;
      border-left: 1px solid var(--color-border);
      padding-top: 0;
      padding-left: 1.5rem;
    }
  }
</style>
