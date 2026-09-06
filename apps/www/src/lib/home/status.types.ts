export const HOME_STATUS_STATES = ['green', 'amber', 'red'] as const;

export type HomeStatusState = (typeof HOME_STATUS_STATES)[number];
