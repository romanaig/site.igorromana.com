// Coleções de conteúdo. O build falha se algum JSON quebrar estas regras
// (01_DECISOES_E_CONTRATO.md, seção 5).
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Texto nos dois idiomas. EN é a base e é obrigatório; PT pode faltar
// (a página PT só é gerada quando todos os campos pt do item existem).
const L = z.object({ en: z.string().min(1), pt: z.string().default('') });
const Lopt = z.object({ en: z.string().default(''), pt: z.string().default('') });
const Llist = z.object({ en: z.array(z.string()).min(1), pt: z.array(z.string()).default([]) });
const cor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const k = z.number().int().min(1).max(5); // classe de cor k1..k5 do design system
const midia = z.string().regex(/^\/(media|cv)\//);
const mascara = z.enum(['r-canto', 'r-diagonal', 'r-horizontal', 'r-pedaco', 'r-tira-diagonal', 'r-tira', 'r-vertical', 'r-vertical_v2', 'r-vertical_v3']);

const site = defineCollection({
  loader: file('src/content/site.json'),
  schema: z.object({
    indexar: z.boolean(),
    nome: z.string(),
    url: z.string().url(),
    titulo: L, linha2: L, frase: L, disponibilidade: L,
    cta: z.object({ rotulo: L, mailto: z.string().email(), assunto: L, corpo: L, chamada_home: L, chamada_case: L }),
    reel: z.object({ vimeo_id: z.string(), url: z.string().url(), loop: midia, poster: midia }),
    logos: z.array(z.object({ marca: z.string(), src: midia, cor: k, inclinado: z.boolean().optional() })),
    depoimentos: z.array(z.object({ texto: L, autor: z.string(), cargo: L, link: z.string().url(), cor: k, inclinado: z.boolean().optional() })),
    sobre: L,
    cv: z.object({ en: midia, pt: midia }),
    contatos: z.array(z.object({ tipo: z.string(), rotulo: z.string(), url: z.string().url(), cor: k })),
    servicos: Llist,
    seo: z.object({ titulo: L, descricao: L, og: midia }),
    analytics: z.object({ cloudflare_token: z.string() }),
    ui: z.record(z.string(), z.any()),
  }),
});

const figura = z.object({
  src: midia,
  poster: midia.optional(),
  alt: L,
  legenda: Lopt.optional(),
  classe: z.string(),            // posição no layout do canvas (q1…q8, s1…s4)
  estilo: z.string().optional(), // ex.: --h:260px
  mascara: mascara.optional(),   // recorte de papel rasgado
  rasgado: z.boolean().optional(),
  pb: z.boolean().optional(),    // P&B, cor no hover
});

const projetos = defineCollection({
  // id = nome do arquivo (o campo slug é {en, pt} e não pode virar id)
  loader: glob({ pattern: '*.json', base: 'src/content/projetos', generateId: ({ entry }) => entry.replace(/\.json$/, '') }),
  schema: z.object({
    id: z.string(),
    slug: z.object({ en: z.string(), pt: z.string() }),
    status: z.enum(['publicado', 'rascunho']),
    exibir_no_portfolio: z.boolean(),
    destaque: z.boolean(),
    ordem: z.number().int(),
    ano: z.string(),
    cor: cor,
    cor_texto: cor,
    cor_titulo: cor.optional(),   // barra atrás do título, quando difere da cor do case
    cliente: z.string(),
    agencia: z.string().default(''),
    logo: midia.optional(),
    // ficha do case: rótulo do cliente (Client/Clients), linha de apoio e o bloco do meio
    // (produção, agência, estúdio, direção…) na ordem do canvas
    ficha: z.object({ cliente_rotulo: L, cliente_sub: Lopt, meio: z.array(z.object({ rotulo: L, valor: L })) }),
    etiqueta: z.enum(['Aired', 'Pitch · unaired', 'Internal', 'Personal']),
    titulo: L,
    nome_card: L,
    resumo: L,
    papel: L, duracao: Lopt,
    blocos: z.object({ desafio: L, processo: L, resultado: Lopt }),
    card: z.object({ mascara: z.enum(['m-h', 'm-v', 'm-d', 'm-c', 'm-t']), classe: z.string(), posicao: z.string().default('center') }),
    loop: z.object({ src: midia, poster: midia.optional(), mascara: mascara, alt: L }),
    filme: z.object({ provider: z.enum(['youtube', 'vimeo', 'ancora']), url: z.string(), id: z.string().optional(), rotulo: L }).optional(),
    brief_img: figura.optional(),
    processo: z.array(figura).default([]),
    resultado: z.array(figura).default([]),
    resultado_legenda: Lopt.optional(),
    brief_linha: z.boolean().default(false), // linha horizontal no fim do Brief (Social)
    // vídeos com play manual (Social): grupos com título, texto e peças no formato original
    pecas: z.object({
      legenda: Lopt,
      grupos: z.array(z.object({
        id: z.string().default(''), rotulo: z.string(), titulo: L, texto: Lopt, escuro: z.boolean(), classe: z.string().default(''),
        itens: z.array(z.object({ src: midia, poster: midia, proporcao: z.string(), titulo: L, legenda: L })),
      })),
    }).optional(),
    mix: z.boolean().default(false),   // no celular, imagens entre os parágrafos (só Neve)
    proximo_mascara: mascara,          // recorte do vídeo do próximo case
    decor: z.record(z.string(), z.string()).default({}),
    seo: z.object({ titulo: L, descricao: L, og: midia.optional() }),
  }),
});

const arquivo = defineCollection({
  loader: file('src/content/arquivo.json'),
  schema: z.object({
    titulo: L,
    ano: z.string(),
    cliente: z.string(),
    papel: L,
    etiqueta: z.enum(['Aired', 'Pitch · unaired', 'Internal', 'Personal']),
    links: z.array(z.object({ url: z.string().url(), rotulo: z.string() })).default([]),
    case_id: z.string().optional(),
    so_mesa: z.boolean().optional(), // só na mesa da home (ex.: os manifestos agrupados)
  }),
});

const mesa = defineCollection({
  loader: file('src/content/mesa.json'),
  schema: z.object({
    trabalho: z.string(),
    x: z.number(), y: z.number(), w: z.number(), rt: z.string(), z: z.number().int(),
    mascara: z.enum(['m-h', 'm-v', 'm-d', 'm-c', 'm-t']),
    sprite: z.string().optional(),  // background-position no sprite da mesa
    imagem: z.enum(['lp', 'lu']).optional(), // capas fora do sprite
    carrossel: z.boolean().default(false),
    carrossel_ordem: z.number().int().optional(),
  }),
});

export const collections = { site, projetos, arquivo, mesa };
