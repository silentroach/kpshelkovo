import {
  flushSync,
  hydrate as hydrateComponent,
  unmount as unmountComponent,
} from 'svelte';

import SettlementsExplorer from '../components/SettlementsExplorer.svelte';
import type { ExplorerPayload } from '../lib/explorer';
import type { ExplorerInstance } from './explorer.types';

export const hydrate = (
  target: HTMLElement,
  payload: ExplorerPayload,
): ExplorerInstance => {
  const instance = hydrateComponent(SettlementsExplorer, {
    target,
    props: payload,
  });
  flushSync();
  return instance;
};

export const unmount = (instance: ExplorerInstance): void => {
  void unmountComponent(instance);
};
