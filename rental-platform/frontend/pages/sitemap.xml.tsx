import { fetchApartments } from '../lib/apartments';
import { SITE_URL } from '../lib/config';

// Static public pages included in the sitemap.
const STATIC_PATHS = [
  '/', '/collections', '/owners', '/story', '/vision', '/team',
  '/journal', '/help', '/safety', '/privacy', '/terms', '/cancellation',
];

function buildXml(urls: string[]) {
  const body = urls
    .map((u) => `  <url><loc>${u.replace(/&/g, '&amp;')}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export async function getServerSideProps(ctx: any) {
  const urls = STATIC_PATHS.map((p) => `${SITE_URL}${p}`);
  try {
    const apartments = await fetchApartments();
    for (const a of apartments) {
      const id = a?._id || a?.id || a?.slug;
      if (id) urls.push(`${SITE_URL}/apartment?id=${id}`);
    }
  } catch {
    /* still serve the static URLs */
  }

  ctx.res.setHeader('Content-Type', 'application/xml');
  ctx.res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  ctx.res.write(buildXml(urls));
  ctx.res.end();
  return { props: {} };
}

export default function Sitemap() {
  return null;
}
