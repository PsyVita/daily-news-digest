import { getCollection, type CollectionEntry } from 'astro:content';

export interface Briefing {
  entry: CollectionEntry<'briefings'>;
  /** 'YYYY-MM-DD' */
  dateKey: string;
  year: string;
  month: string;
  day: string;
  /** '/YYYY/MM/DD' */
  url: string;
  topStory: string;
  funFact: string;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * All briefings sorted ascending by date. Dates are derived from file paths by
 * the loader — plain calendar dates, no timezone conversion anywhere.
 */
export async function getBriefings(): Promise<Briefing[]> {
  const entries = await getCollection('briefings');
  return entries
    .map((entry) => {
      const match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(entry.id);
      if (!match) return null;
      const [, year, month, day] = match;
      return {
        entry,
        dateKey: `${year}-${month}-${day}`,
        year,
        month,
        day,
        url: `/${year}/${month}/${day}`,
        topStory: entry.data.topStory,
        funFact: entry.data.funFact,
      };
    })
    .filter((b): b is Briefing => b !== null)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

/** Day of week without timezone pitfalls (pure UTC arithmetic). */
function weekdayIndex(b: Briefing): number {
  return new Date(Date.UTC(Number(b.year), Number(b.month) - 1, Number(b.day))).getUTCDay();
}

/** 'Jun 11, 2026' — used in <title>. */
export function formatShort(b: Briefing): string {
  return `${MONTHS_SHORT[Number(b.month) - 1]} ${Number(b.day)}, ${b.year}`;
}

/** 'Thursday, June 11, 2026' — used as the page heading. */
export function formatLong(b: Briefing): string {
  return `${WEEKDAYS_LONG[weekdayIndex(b)]}, ${MONTHS_LONG[Number(b.month) - 1]} ${Number(b.day)}, ${b.year}`;
}

/** 'Thu, Jun 11' — used in the compact date strip. */
export function formatStrip(b: Briefing): string {
  return `${WEEKDAYS_SHORT[weekdayIndex(b)]}, ${MONTHS_SHORT[Number(b.month) - 1]} ${Number(b.day)}`;
}
