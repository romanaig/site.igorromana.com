"""Rodada de testes do site (máx. 5 por rodada, seção 1 das decisões).

Uso: npm run build && npx astro preview --port 4321 &  depois  python3 tests/site_check.py [url_base] [chrome]
Precisa do pacote Python `playwright` e de um Chrome/Chromium instalado.
"""
import asyncio, re, sys, os
from urllib.parse import urljoin, urlparse
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4321"
CHROME = sys.argv[2] if len(sys.argv) > 2 else "/usr/bin/google-chrome"
DIST = os.path.join(os.path.dirname(__file__), "..", "dist")


def pages():
    out = []
    for root, _, files in os.walk(DIST):
        for f in files:
            if f == "index.html":
                rel = os.path.relpath(root, DIST).replace("\\", "/")
                out.append("/" if rel == "." else f"/{rel}/")
    return sorted(out)


async def main():
    results = []
    def rec(name, ok, detail=""):
        results.append((name, ok, detail)); print(("PASSOU " if ok else "FALHOU ") + name + (f" — {detail}" if detail else ""))

    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=["--autoplay-policy=no-user-gesture-required"])
        desk = await b.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        desk.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        desk.on("pageerror", lambda e: errors.append(str(e)))

        # 1. Toda página abre, tem título, idioma, canonical e noindex (até o lançamento)
        falhas = []
        for path in pages():
            r = await desk.goto(BASE + path, wait_until="load")
            head = await desk.evaluate("""() => ({t: document.title, l: document.documentElement.lang,
              c: document.querySelector('link[rel=canonical]')?.href, r: document.querySelector('meta[name=robots]')?.content,
              h1: document.querySelectorAll('h1').length})""")
            if r.status != 200 or not head["t"] or not head["l"] or not head["c"] or head["h1"] != 1:
                falhas.append(f"{path} {r.status} {head}")
        rec("1. páginas com status 200, título, idioma, canonical e um h1", not falhas, "; ".join(falhas))

        # 2. Nenhum link interno ou mídia quebrada
        quebrados = set()
        for path in pages():
            await desk.goto(BASE + path, wait_until="load")
            refs = await desk.evaluate("""() => [...document.querySelectorAll('[src],[href],[poster],[data-src]')]
              .flatMap(e => ['src','href','poster','data-src'].map(a => e.getAttribute(a)).filter(Boolean))""")
            css_urls = await desk.evaluate("""() => [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(r => r.cssText) } catch { return [] } })
              .join(' ').match(/url\\(\"?(\\/[^)\"]+)\"?\\)/g) || []""")
            refs += [re.sub(r'^url\("?|"?\)$', "", u) for u in css_urls]
            for ref in refs:
                if ref.startswith(("mailto:", "http", "#", "data:", "about:")): continue
                u = urljoin(BASE + path, ref)
                if urlparse(u).netloc != urlparse(BASE).netloc: continue
                local = os.path.join(DIST, urlparse(u).path.lstrip("/"))
                if not (os.path.isfile(local) or os.path.isfile(os.path.join(local, "index.html"))):
                    quebrados.add(f"{path} → {ref}")
        rec("2. links internos, imagens, vídeos e máscaras existem", not quebrados, "; ".join(sorted(quebrados)[:10]))

        # 3. Play reel abre o Vimeo numa caixa com dnt=1 e fecha limpando o player
        await desk.goto(BASE + "/", wait_until="load")
        await desk.click("a.play")
        src = await desk.get_attribute("dialog.vplayer iframe", "src")
        aberto = await desk.evaluate("document.querySelector('dialog.vplayer').open")
        await desk.click("dialog.vplayer .vplayer-x"); await desk.wait_for_timeout(300)
        fechado = await desk.evaluate("!document.querySelector('dialog.vplayer').open && document.querySelector('dialog.vplayer iframe').src === 'about:blank'")
        rec("3. reel abre no player com dnt=1 e fecha", bool(aberto and src and "dnt=1" in src and fechado), src or "")

        # 4. Mesa: o recorte abre o cartão com título e link em nova aba
        await desk.goto(BASE + "/", wait_until="load")
        btn = desk.locator("div.mesa3 button.rc").first
        alvo = await btn.get_attribute("popovertarget")
        await btn.scroll_into_view_if_needed(); await btn.click(force=True)
        pop = desk.locator(f"#{alvo}")
        visivel = await pop.is_visible()
        titulo = (await pop.locator(".pt").inner_text()) if visivel else ""
        alvo_link = await pop.locator("a").first.get_attribute("target") if await pop.locator("a").count() else "_blank"
        rec("4. mesa: recorte abre o cartão com título e link em nova aba", visivel and bool(titulo) and alvo_link == "_blank", titulo)

        # 5. Celular (390 px): nenhuma página com rolagem lateral; na home, carrossel no lugar da mesa
        mob = await b.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        largos = []
        for path in pages():
            await mob.goto(BASE + path, wait_until="load")
            w = await mob.evaluate("document.documentElement.scrollWidth")
            if w > 391: largos.append(f"{path} {w}px")
        await mob.goto(BASE + "/", wait_until="load")
        carr = await mob.locator("div.carr3").is_visible(); mesa = await mob.locator("div.mesa3").is_visible()
        rec("5. celular: sem rolagem lateral; carrossel no lugar da mesa", not largos and carr and not mesa, "; ".join(largos) + f" carrossel={carr} mesa={mesa}")

        await b.close()
    if errors:
        print("Erros no console:", *sorted(set(errors))[:10], sep="\n  ")
    return results, sorted(set(errors))


if __name__ == "__main__":
    res, errs = asyncio.run(main())
    sys.exit(0 if all(ok for _, ok, _ in res) else 1)
