import { describe, expect, it } from 'vitest';

import { meetingSourceId, meetingTranscriptYamlId } from '../source';

describe('meeting source IDs', () => {
  it('uses the meeting directory slug', () => {
    expect(meetingSourceId('residents-2026/index.yaml')).toBe('residents-2026');
  });

  it.each([
    ['index.yaml', 'must be exactly [slug]/index.yaml'],
    ['Bad_slug/transcript.yaml', 'must be exactly [slug]/index.yaml'],
    ['nested/meeting/index.yaml', 'must be exactly [slug]/index.yaml'],
    ['Bad_slug/index.yaml', 'slug must use lower-case Latin letters, digits, and hyphen'],
    ['/index.yaml', 'slug must use lower-case Latin letters, digits, and hyphen']
  ])('rejects invalid meeting source %s', (entry, reason) => {
    expect(() => meetingSourceId(entry)).toThrow(`meeting data path "${entry}" ${reason}`);
  });

  it.each([
    ['transcript.yaml', '1'],
    ['transcript-2.yaml', '2'],
    ['transcript-10.yaml', '10'],
    ['transcript-101.yaml', '101']
  ])('assigns the correct transcript part for %s', (file, part) => {
    expect(meetingTranscriptYamlId(`residents-2026/${file}`)).toBe(`residents-2026/${part}`);
  });

  it.each([
    'transcript-0.yaml',
    'transcript-1.yaml',
    'transcript-02.yaml',
    'transcript-2.yml',
    'index.yaml'
  ])('rejects invalid transcript filename %s', (file) => {
    expect(() => meetingTranscriptYamlId(`meeting/${file}`)).toThrow(
      `meeting data path "meeting/${file}" must use transcript.yaml or transcript-N.yaml with N starting from 2`
    );
  });

  it.each([
    [
      'nested/Bad_slug/transcript-0.yaml',
      'must be exactly [slug]/transcript.yaml or [slug]/transcript-N.yaml'
    ],
    ['Bad_slug/transcript-0.yaml', 'slug must use lower-case Latin letters, digits, and hyphen'],
    ['/transcript.yaml', 'slug must use lower-case Latin letters, digits, and hyphen']
  ])('checks path depth and slug before the transcript part: %s', (entry, reason) => {
    expect(() => meetingTranscriptYamlId(entry)).toThrow(`meeting data path "${entry}" ${reason}`);
  });
});
