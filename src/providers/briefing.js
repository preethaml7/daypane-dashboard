import { cached } from '../cache.js';
import { getConfig } from '../config.js';

const DEFAULT_SECTIONS = [
  { title: 'TOP STORIES', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World' },
  { title: 'TECH & TRENDS', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', source: 'BBC Technology' },
  { title: 'BUSINESS & FINANCE', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC Business' },
];
const decode = text => text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).trim();

export function getBriefing() {
  return cached('briefing', 10 * 60 * 1000, async () => {
    const sections = getConfig().briefing?.sections || DEFAULT_SECTIONS;
    const results = await Promise.all(sections.slice(0, 3).map(async section => {
      try {
        const response = await fetch(section.url, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const xml = await response.text();
        const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)]
          .map(match => ({ title: decode(match[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] || '') }))
          .filter(item => item.title).slice(0, 3);
        return { title: section.title, source: section.source, items, ok: items.length > 0 };
      } catch (error) {
        return { title: section.title, source: section.source, items: [], ok: false, error: error.message };
      }
    }));
    return { ok: results.some(section => section.ok), sections: results };
  });
}
