# igorromana.com

Portfolio site of Igor Romana — Motion Designer & Editor.

Static site built with [Astro](https://astro.build) and published on GitHub Pages by GitHub Actions.

## Rights

The code in this repository is public so the site can be hosted on GitHub Pages.
The content is not free to reuse: all videos, images, drawings, scans, texts and client work
© Igor Romana and the respective brands. All rights reserved.

## Working on it

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # builds to dist/ and checks page weights
```

- Content lives in `src/content/` (JSON, validated with zod in `src/content.config.ts`):
  `site.json`, `projetos/<id>.json`, `arquivo.json` (Archive), `mesa.json` (work table on the home page).
- Media in `public/media/<id>/`, CVs in `public/cv/`.
- The site is kept out of search engines until launch: set `"indexar": true` in `src/content/site.json`.
- Portuguese pages are generated only when every `pt` field of a page is filled in.
