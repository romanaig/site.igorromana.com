// Acesso aos dados e às rotas nos dois idiomas.
import { getCollection, getEntry } from 'astro:content';

export type Lang = 'en' | 'pt';
export type Txt = { en: string; pt?: string };

/** Texto no idioma pedido. Em PT, cai para EN só onde o build permite (nunca numa página PT publicada). */
export const t = (v: Txt | undefined, lang: Lang): string => (v ? (lang === 'pt' && v.pt ? v.pt : v.en) : '');

export async function getSite() {
  const e = await getEntry('site', 'site');
  if (!e) throw new Error('src/content/site.json: falta a entrada "site"');
  return e.data;
}

/** Cases publicados (status + exibir_no_portfolio), na ordem do portfólio. */
export async function getCases() {
  const all = await getCollection('projetos');
  return all
    .map((e) => e.data)
    .filter((p) => p.status === 'publicado' && p.exibir_no_portfolio)
    .sort((a, b) => a.ordem - b.ordem);
}

/** Todos os cases (inclusive rascunhos), para cards e "próximo case" enquanto as páginas entram. */
export async function getAllCases() {
  const all = await getCollection('projetos');
  return all.map((e) => e.data).sort((a, b) => a.ordem - b.ordem);
}

export const paths = {
  home: (l: Lang) => (l === 'en' ? '/' : '/pt/'),
  about: (l: Lang) => (l === 'en' ? '/about/' : '/pt/sobre/'),
  archive: (l: Lang) => (l === 'en' ? '/archive/' : '/pt/arquivo/'),
  project: (l: Lang, slug: { en: string; pt: string }) =>
    l === 'en' ? `/projects/${slug.en}/` : `/pt/projetos/${slug.pt}/`,
};

/** mailto do "Get a quote" com assunto e corpo prontos. */
export function quoteHref(site: Awaited<ReturnType<typeof getSite>>, lang: Lang) {
  const s = encodeURIComponent(t(site.cta.assunto, lang));
  const b = encodeURIComponent(t(site.cta.corpo, lang));
  return `mailto:${site.cta.mailto}?subject=${s}&body=${b}`;
}

/** Verdadeiro se todos os campos pt de um objeto estão preenchidos (regra do build para gerar a página PT). */
export function ptCompleto(obj: unknown): boolean {
  let ok = true;
  const walk = (v: unknown) => {
    if (!ok || v === null || typeof v !== 'object') return;
    if (Array.isArray(v)) return v.forEach(walk);
    const o = v as Record<string, unknown>;
    if ('en' in o && typeof o.en === 'string') {
      if (o.en && !(typeof o.pt === 'string' && o.pt)) ok = false;
      return;
    }
    Object.values(o).forEach(walk);
  };
  walk(obj);
  return ok;
}

/** Quebra um texto com \n\n em parágrafos e \n em linhas. */
export const paragraphs = (s: string) => s.split(/\n{2,}/).filter(Boolean);
