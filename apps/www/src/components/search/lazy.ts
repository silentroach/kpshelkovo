import { flushSync, hydrate, unmount } from 'svelte';

import SearchDialog from './SearchDialog.svelte';
import { SEARCH_DIALOG_OPEN_EVENT } from './search-dialog.events';

let component: Record<string, unknown> | undefined;

const unmountSearchDialog = (): void => {
  if (!component) {
    return;
  }

  void unmount(component);
  component = undefined;
};

document.addEventListener('astro:before-swap', unmountSearchDialog);

export const openSearchDialog = (
  root: HTMLElement,
  opener: HTMLElement,
  initialQuery: string,
): void => {
  if (!component) {
    component = hydrate(SearchDialog, {
      target: root,
      props: { initialQuery },
    });
    flushSync();
    root.setAttribute('data-search-dialog-hydrated', '');
  }

  document.dispatchEvent(
    new CustomEvent(SEARCH_DIALOG_OPEN_EVENT, { detail: opener }),
  );
};
