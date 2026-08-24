import type { APIRoute, GetStaticPaths } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadMeeting, loadMeetings } from '@/lib/meetings/load';
import { buildMeetingMarkdown } from '@/lib/meetings/markdown';

export const prerender = true;

export const getStaticPaths = (async () => {
  const meetings = await loadMeetings();

  return meetings.map((meeting) => ({
    params: {
      slug: meeting.slug,
    },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;

  if (!slug) {
    throw new Error('meeting slug is required');
  }

  const meeting = await loadMeeting(slug);

  if (!meeting) {
    throw new Error(`meeting "${slug}" not found`);
  }

  return createMarkdownResponse(buildMeetingMarkdown(meeting));
};
