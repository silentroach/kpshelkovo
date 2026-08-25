import { flushSync, mount, unmount } from 'svelte';

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

export const openSearchDialog = (opener: HTMLElement): void => {
  if (!component) {
    component = mount(SearchDialog, { target: document.body });
    flushSync();
  }

  document.dispatchEvent(
    new CustomEvent(SEARCH_DIALOG_OPEN_EVENT, { detail: opener }),
  );
};
