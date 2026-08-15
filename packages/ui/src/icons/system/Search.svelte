<script lang="ts">
  interface Props {
    readonly class?: string;
  }

  let { class: className }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  class={className}
  fill="none"
  stroke="currentColor"
  stroke-width="1.9"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <circle cx="10.75" cy="10.75" r="6.5"></circle>
  <path d="m15.5 15.5 4.25 4.25"></path>
</svg>
