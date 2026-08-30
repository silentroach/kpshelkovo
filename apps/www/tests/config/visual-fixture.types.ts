export interface VisualFixturePlaywrightOptions {
  readonly testMatch: string;
  readonly port: number;
  readonly viewport: {
    readonly width: number;
    readonly height: number;
  };
  readonly command: string;
  readonly testTimeout: number;
  readonly serverTimeout: number;
}
