// sitemap.xml com as versões EN e PT de cada página (hreflang). Só entra no robots.txt depois do lançamento.
import type { APIRoute } from 'astro';
import { getSite, getCases, paths, ptCompleto } from '../lib/site';

export const GET: APIRoute = async () => {
  const site = await getSite();
  const cases = await getCases();
  const abs = (p: string) => new URL(p, site.url).href;
  const pages: { en: string; pt?: string }[] = [
    { en: paths.home('en'), pt: ptCompleto(site) ? paths.home('pt') : undefined },
    { en: paths.about('en'), pt: ptCompleto(site) ? paths.about('pt') : undefined },
    { en: paths.archive('en') },
    ...cases.map((c) => ({ en: paths.project('en', c.slug), pt: ptCompleto(c) ? paths.project('pt', c.slug) : undefined })),
  ];
  const alt = (p: { en: string; pt?: string }) =>
    [`<xhtml:link rel="alternate" hreflang="en" href="${abs(p.en)}"/>`, p.pt && `<xhtml:link rel="alternate" hreflang="pt-BR" href="${abs(p.pt)}"/>`, `<xhtml:link rel="alternate" hreflang="x-default" href="${abs(p.en)}"/>`]
      .filter(Boolean).join('');
  const urls = pages.flatMap((p) => [p.en, ...(p.pt ? [p.pt] : [])].map((u) => `<url><loc>${abs(u)}</loc>${alt(p)}</url>`));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
