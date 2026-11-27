export interface MeetingMoment {
  readonly at: Date;
  readonly iso: string;
  readonly hasTime: boolean;
}

export interface MeetingTranscriptTime {
  readonly value: string;
  readonly totalSeconds: number;
}

export interface MeetingSpeaker {
  readonly id: string;
  readonly kind: 'person' | 'local';
  readonly label: string;
  readonly description?: string;
  readonly personSlug?: string;
  readonly url?: string;
}

export interface MeetingTranscriptSegment {
  readonly kind: 'segment';
  readonly anchor: string;
  readonly start: MeetingTranscriptTime;
  readonly speakerId: string;
  readonly speaker: MeetingSpeaker;
  readonly text: string;
  readonly textMarkdown: string;
  readonly textHtml: string;
}

export interface MeetingTranscriptNote {
  readonly kind: 'note';
  readonly text: string;
}

export type MeetingTranscriptEntry = MeetingTranscriptSegment | MeetingTranscriptNote;

export interface MeetingTranscriptPart {
  readonly index: number;
  /** Render order, including editorial notes. */
  readonly entries: readonly MeetingTranscriptEntry[];
  /** Speech only, for counts and timestamp ranges. */
  readonly segments: readonly MeetingTranscriptSegment[];
}

export interface MeetingTranscript {
  readonly speakers: readonly MeetingSpeaker[];
  readonly parts: readonly MeetingTranscriptPart[];
  readonly segments: readonly MeetingTranscriptSegment[];
}

export interface Meeting {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly date: MeetingMoment;
  readonly updatedAt?: MeetingMoment;
  readonly context: string;
  readonly sourceUrls: readonly string[];
  readonly url: string;
  readonly canonical: string;
  readonly transcript: MeetingTranscript;
}

export interface MeetingsDataset {
  readonly meetings: readonly Meeting[];
  readonly bySlug: ReadonlyMap<string, Meeting>;
}
