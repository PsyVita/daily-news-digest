import type { APIRoute } from 'astro';
import { getBriefings } from '../lib/briefings';

// Lightweight build-time index of all briefing dates, lazy-loaded by the
// calendar island. Derived entirely from briefings/ — never hand-maintained.
export const GET: APIRoute = async () => {
  const briefings = await getBriefings();
  const index = briefings.map((b) => ({
    date: b.dateKey,
    topStory: b.topStory,
    funFact: b.funFact,
  }));
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
};
