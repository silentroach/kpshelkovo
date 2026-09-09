import type { ResolvedConfig } from 'vite';

export type SearchDialogOuterConfig = Readonly<Pick<ResolvedConfig, 'command' | 'define' | 'mode'>>;

export type SearchDialogGraphEnvironment = {
  readonly command: ResolvedConfig['command'];
  readonly mode: string;
  readonly pagefindDevSnapshotAvailable: string;
};

export type SearchDialogGraphBuilder = (
  environment: SearchDialogGraphEnvironment
) => Promise<string>;
