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

<ul data-testid="sources-list" class="border-y border-border">
  {#each sources as source (source.url)}
    <li
      class="flex flex-col gap-2 border-t border-border py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-w-0 flex-1">
        <div class="mb-1 flex items-center gap-2">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            class="truncate font-semibold text-foreground hover:text-primary"
            data-testid="source-link"
          >
            {source.title}
          </a>
          <span class={typeColors[source.type]}>
            {typeLabels[source.type]}
          </span>
        </div>
        {#if source.comment}
          <p class="mt-1 text-sm text-muted-foreground">{source.comment}</p>
        {/if}
      </div>
      <div class="whitespace-nowrap text-sm text-muted-foreground sm:ml-4">
        {formatDate(source.dateChecked)}
      </div>
    </li>
  {/each}
</ul>
