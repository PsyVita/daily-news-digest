import type { Loader } from 'astro/loaders';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Custom loader for `briefings/YYYY/MM/DD.md`.
 *
 * Built for resilience: the date comes from the file path (authoritative, no
 * timezone math), frontmatter is parsed tolerantly, and every file is handled
 * inside its own try/catch — one malformed briefing logs a warning and is
 * skipped, it never fails the whole build.
 */

const FILE_RE = /^(\d{4})[/\\](\d{2})[/\\](\d{2})\.md$/;

interface Frontmatter {
  [key: string]: string;
}

/**
 * Minimal, never-throwing frontmatter parser. Briefing frontmatter is flat
 * `key: value` scalars, so a full YAML parser (and its failure modes) is
 * deliberately avoided.
 */
function splitFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { data: {}, body: raw };
  const data: Frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let value = kv[2].trim();
    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value[0];
      const close = value.indexOf(quote, 1);
      value = close > 0 ? value.slice(1, close) : value.slice(1);
    } else {
      // strip trailing YAML comment (` # ...`)
      const hash = value.search(/\s#/);
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    if (value) data[kv[1]] = value;
  }
  return { data, body: raw.slice(match[0].length) };
}

function firstHeadingText(body: string): string | undefined {
  const match = /^#{1,6}\s+(.+)$/m.exec(body);
  return match?.[1].trim();
}

function isRealDate(y: number, m: number, d: number): boolean {
  // Date.UTC round-trip catches impossible dates (e.g. Feb 30) without any
  // local-timezone involvement.
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

export function briefingsLoader(): Loader {
  return {
    name: 'briefings-loader',
    load: async ({ store, logger, parseData, renderMarkdown, config }) => {
      store.clear();
      const root = path.join(fileURLToPath(config.root), 'briefings');
      let count = 0;

      for await (const file of walk(root)) {
        const rel = path.relative(root, file);
        const pathMatch = FILE_RE.exec(rel);
        if (!pathMatch) {
          if (rel.endsWith('.md')) {
            logger.warn(
              `Skipping ${rel}: path does not match briefings/YYYY/MM/DD.md`
            );
          }
          continue;
        }
        const [, year, month, day] = pathMatch;
        if (!isRealDate(Number(year), Number(month), Number(day))) {
          logger.warn(`Skipping ${rel}: ${year}-${month}-${day} is not a real date`);
          continue;
        }
        const id = `${year}/${month}/${day}`;
        const dateKey = `${year}-${month}-${day}`;

        try {
          const raw = await fs.readFile(file, 'utf8');
          const { data: fm, body } = splitFrontmatter(raw);

          if (fm.date && fm.date !== dateKey) {
            logger.warn(
              `${rel}: frontmatter date "${fm.date}" does not match path; using path date ${dateKey}`
            );
          }

          // Fallbacks per spec: missing topStory -> first heading text,
          // missing funFact -> "Fun fact". Never fail on missing frontmatter.
          const data = {
            ...fm,
            date: dateKey,
            topStory: fm.topStory || firstHeadingText(body) || dateKey,
            funFact: fm.funFact || 'Fun fact',
          };

          let parsed;
          try {
            parsed = await parseData({ id, data });
          } catch (err) {
            logger.warn(`${rel}: frontmatter failed validation, using fallbacks (${err})`);
            parsed = await parseData({
              id,
              data: { date: dateKey, topStory: dateKey, funFact: 'Fun fact' },
            });
          }

          const rendered = await renderMarkdown(body);
          store.set({ id, data: parsed, body, rendered });
          count++;
        } catch (err) {
          logger.warn(`Skipping ${rel}: could not be parsed (${err})`);
        }
      }

      logger.info(`Loaded ${count} briefing(s)`);
    },
  };
}
