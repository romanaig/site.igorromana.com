// Confere, depois do build, o peso de cada página ao abrir (01_DECISOES seção 5 / 2m):
// HTML + CSS + JS + fontes + mídia que carrega sem rolar (vídeos com src, pôsteres, imagens sem lazy).
// Loops com data-src (carregam ao entrar na tela) e vídeos com play manual não contam.
// Imagens de fundo e máscaras: as do style inline e as regras do CSS cujas classes aparecem na página
// (conta a mais, de propósito: melhor errar para cima do que deixar passar).
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const LIMITE = 4 * 1024 * 1024;
const LIMITES_ARQ = [ // regra por tipo de arquivo de mídia
  [/\/media\/home\/reel-loop\.mp4$/, 3 * 1024 * 1024, 'hero'],
  [/\.mp4$/, 1024 * 1024, 'loop'],
];
const size = (p) => (existsSync(p) ? statSync(p).size : 0);
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const pages = walk(DIST).filter((f) => f.endsWith('.html'));
let falhou = false;
const kb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const urls = new Set();
  for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) urls.add(m[1]);
  for (const m of html.matchAll(/<script[^>]+src="(\/[^"]+)"/g)) urls.add(m[1]);
  for (const m of html.matchAll(/<video\b[^>]*>/g)) {
    const tag = m[0];
    const src = tag.match(/\ssrc="([^"]+)"/); const poster = tag.match(/poster="([^"]+)"/);
    if (poster) urls.add(poster[1]);
    if (src && !/preload="none"/.test(tag)) urls.add(src[1]);
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (/loading="lazy"/.test(m[0])) continue;
    const src = m[0].match(/src="([^"]+)"/); if (src) urls.add(src[1]);
  }
  let total = Buffer.byteLength(html);
  let css = '';
  const counted = new Set();
  for (const u of urls) {
    counted.add(u);
    const f = join(DIST, decodeURIComponent(u.split('?')[0]));
    total += size(f);
    if (u.endsWith('.css') && existsSync(f)) css += readFileSync(f, 'utf8');
  }
  // fundos e máscaras em style inline
  for (const m of html.matchAll(/style="[^"]*"/g)) for (const u of m[0].matchAll(/url\((?:&quot;|['"])?(\/[^)'"&]+)/g)) urls.add(u[1]);
  // fundos e máscaras do CSS, só das regras com alguma classe usada na página
  const classes = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
  for (const r of css.matchAll(/([^{}]+)\{([^{}]*url\([^)]*\)[^{}]*)\}/g)) {
    const sel = r[1]; const corpo = r[2];
    const usadas = [...sel.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
    if (!usadas.length || !usadas.some((c) => classes.has(c))) continue;
    for (const u of corpo.matchAll(/url\((?:['"])?(\/media\/[^)'"]+)/g)) urls.add(u[1]);
  }
  for (const u of urls) {
    if (!u.startsWith('/media/') || counted.has(u)) continue;
    counted.add(u); total += size(join(DIST, decodeURIComponent(u.split('?')[0])));
  }
  // fontes latinas usadas pelo CSS
  for (const m of css.matchAll(/url\(([^)]*?-latin-(?:400|700|900)-normal[^)]*?\.woff2)\)/g)) total += size(join(DIST, m[1].replace(/^\.\//, '/_astro/')));
  const ok = total <= LIMITE;
  if (!ok) falhou = true;
  console.log(`${ok ? 'ok  ' : 'ACIMA'} ${kb(total).padStart(8)}  ${page.replace(DIST, '')}`);
}
for (const f of walk(join(DIST, 'media')).filter((f) => f.endsWith('.mp4'))) {
  const rel = f.replace(DIST, '').replace(/\\/g, '/');
  if (rel.startsWith('/media/social-medias/pecas/')) continue; // peças do Social: play manual
  const regra = LIMITES_ARQ.find(([re]) => re.test(rel));
  if (regra && size(f) > regra[1]) { falhou = true; console.log(`ACIMA ${kb(size(f))}  ${rel} (limite do ${regra[2]})`); }
}
if (falhou) { console.error('\nPeso acima do limite (seção 5 das decisões).'); process.exit(1); }
