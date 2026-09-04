<script lang="ts">
  import { formatDate } from '@shelkovo/format';

  import type { Source, SourceType } from '../lib/settlement/types';

  interface Props {
    sources: Source[];
  }

  let { sources }: Props = $props();

  const typeLabels: Record<SourceType, string> = {
    official: 'Официальный',
    community: 'Сообщество',
    media: 'СМИ',
    personal: 'Личное',
  };

  const typeColors: Record<SourceType, string> = {
    official: 'ui-badge ui-badge-success',
    community: 'ui-badge ui-badge-info',
    media: 'ui-badge ui-badge-warning',
    personal: 'ui-badge ui-badge-muted',
  };
</script>

<ul data-testid="sources-list" class="sources-list">
  {#each sources as source (source.url)}
    <li class="source-row">
      <div class="source-content">
        <div class="source-heading">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            class="source-link"
            data-testid="source-link"
          >
            {source.title}
          </a>
          <span class={typeColors[source.type]}>
            {typeLabels[source.type]}
          </span>
        </div>
        {#if source.comment}
          <p class="source-comment">{source.comment}</p>
        {/if}
      </div>
      <div class="source-date">
        {formatDate(source.dateChecked)}
      </div>
    </li>
  {/each}
</ul>

<style>
  .sources-list {
    border-block: 1px solid var(--color-border);
  }

  .source-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-block: 0.75rem;
    border-top: 1px solid var(--color-border);
  }

  .source-row:first-child {
    border-top: 0;
  }

  .source-content {
    min-width: 0;
    flex: 1;
  }

  .source-heading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .source-link {
    overflow: hidden;
    color: var(--color-text);
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .source-link:is(:hover, :focus-visible) {
    color: var(--color-primary);
  }

  .source-comment,
  .source-date {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .source-comment {
    margin-top: 0.25rem;
  }

  .source-date {
    white-space: nowrap;
  }

  @media (min-width: 40rem) {
    .source-row {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .source-date {
      margin-left: 1rem;
    }
  }
</style>
