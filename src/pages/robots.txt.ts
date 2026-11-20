// robots.txt: fechado para buscadores até o lançamento (site.json → "indexar": true).
import type { APIRoute } from 'astro';
import { getSite } from '../lib/site';
export const GET: APIRoute = async () => {
  const site = await getSite();
  const body = site.indexar
    ? `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`
    : `User-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
