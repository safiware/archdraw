# archdraw.dev

The landing site for archdraw: a static [Astro](https://astro.build) site with [GSAP](https://gsap.com) animations, deployed on Vercel.

The site makes no request to any host but its own. Fonts are self-hosted from `@fontsource` packages (Latin subset), GSAP is bundled from npm, and there are no analytics, cookies or third-party embeds. The privacy page (`/privacy`) says so; keep it true.

## Run it

Node 22.12 or later.

```sh
cd site
npm install
npm run dev       # http://localhost:4321, reloads as you edit
npm run build     # writes the static site to dist/
npm run preview   # serves dist/ at http://localhost:4321
```

`npm run preview` does not apply the headers in `vercel.json`. To see the page under its real Content Security Policy, deploy a preview on Vercel.

## What is where

```
site/
├─ astro.config.mjs        static output, clean file URLs, nothing inlined (the CSP allows only 'self')
├─ vercel.json             clean URLs, caching, security headers
├─ public/                 favicons, og.png (1200×630), robots.txt, theme-init.js
└─ src/
   ├─ pages/               index, privacy, 404
   ├─ layouts/Base.astro   meta, social cards, font preloads, theme before first paint
   ├─ components/          one per section, plus Header, Footer, Logo and Diagram
   ├─ lib/                 the Bean There example (bean.ts) and its SVG markup (diagram.ts)
   ├─ scripts/             one small client script per interactive piece; gsap.ts registers the plugins
   └─ styles/              tokens and shared styles, the diagram, @font-face rules
```

The page is complete without JavaScript: every word is in the HTML, and the animations only decorate it. With `prefers-reduced-motion: reduce` nothing moves and the review story shows its end state. The review story pins only on screens at least 1024 px wide and 660 px tall.

### Content Security Policy

`vercel.json` sends `script-src 'self'; style-src 'self'` with no `unsafe-inline`. So:

- no inline `<script>` or `<style>` and no `style="…"` attributes in the markup. Astro is set to never inline stylesheets (`build.inlineStylesheets: 'never'`) or small scripts (`vite.build.assetsInlineLimit: 0`);
- the theme is applied before first paint by `public/theme-init.js`, a file rather than an inline script;
- scripts may still set styles through the DOM (`el.style.x = …`), which is how GSAP animates.

After changing the markup, check `dist/*.html` has no `<style`, no `style="` and no `<script>` without `src`.

## Deploy on Vercel

1. In Vercel, **Add New… › Project** and import `safiware/archdraw` from GitHub.
2. Set **Root Directory** to `site`. The framework is detected as **Astro**; the build command (`npm run build`) and output directory (`dist`) come from `vercel.json`. No environment variables are needed.
3. In the project settings, turn off the **Vercel Toolbar** for preview deployments. It injects a script from vercel.live, which the CSP blocks (and which the privacy page says never happens). Leave Web Analytics and Speed Insights off for the same reason.
4. Deploy. Every pull request that touches the repo gets a preview URL; merges to `main` go to production.
5. In the project's **Settings › Domains**, add `archdraw.dev` and `www.archdraw.dev`. Make one redirect to the other (Vercel offers this when you add the second).

### DNS at Namecheap

In Namecheap, open **Domain List › archdraw.dev › Manage › Advanced DNS** and add:

| Type | Host | Value |
|---|---|---|
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

These are Vercel's usual values. Use the exact values Vercel's Domains page shows for your project; they can differ per project. Remove any other `A`, `AAAA`, `CNAME` or URL-redirect records for `@` and `www` (Namecheap adds a parking record by default). Vercel issues the HTTPS certificate once the records resolve.

`vercel.json` sends `Strict-Transport-Security` with `includeSubDomains`, so every subdomain of archdraw.dev must serve HTTPS.

## Images

`public/og.png` is the hero rendered at 1200×630, and `favicon-32.png` and `apple-touch-icon.png` are rendered from the logo. Re-render them with a headless browser if the hero or the logo changes; `favicon.svg` is the logo itself and needs no rendering.
