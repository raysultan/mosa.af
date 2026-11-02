# mosa.af — Muhammad Mosa

Portfolio site for **Muhammad Mosa**, a graphics & motion designer.
Dark editorial layout, a custom WebGL hero, scroll-driven motion and case-study overlays.

Built with **Vite + Three.js + GSAP + Lenis**. No framework, no CSS library.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the build locally
```

Node 18+ is recommended.

## What's inside

| Path | Purpose |
| --- | --- |
| `index.html` | All page markup (hero, about, work, reel, services, contact, footer, modal) |
| `src/style.css` | Design system, layout, responsive rules, reduced-motion fallbacks |
| `src/main.js` | Loader, Lenis smooth scroll, GSAP reveals/parallax/tilt, cursor, modal, clock |
| `src/three/scene.js` | Hero WebGL: displaced shader blob, wireframe shell, orbit rings, particles, bloom |
| `public/work/` | Placeholder project imagery |
| `public/favicon.svg` | Acid-green "M" mark |

### The 3D hero

- `IcosahedronGeometry` displaced in a vertex shader with layered sine fields (no textures)
- Fresnel + noise gradient fragment shader in deep violet → acid lime
- Three additive orbit rings, 760 drifting particles, a faint geodesic shell
- `UnrealBloomPass` for the glow
- Pointer parallax, scroll rotation/dolly, and rendering paused once the hero leaves the viewport
- Lower geometry detail + pixel ratio on mobile; single static frame for `prefers-reduced-motion`

## Customising

### 1. Put his real work in

All imagery is placeholder photography from Unsplash. Replace the files in `public/work/`
(keep the names, or update the paths in `index.html` and `src/main.js`):

| File | Used for |
| --- | --- |
| `portrait.jpg` | About portrait |
| `work-01.jpg` | NOVA case study |
| `work-02.jpg` | Kinetic Bloom + filmstrip |
| `work-03.jpg` | Halcyon + filmstrip |
| `work-04.jpg` | Static/Frequency |
| `work-05.jpg` | Orbis + filmstrip |
| `work-06.jpg` | Neon Souq + filmstrip |
| `reel.jpg` | Showreel background |
| `gallery-01.jpg`, `gallery-02.jpg` | Filmstrip |

Recommended: JPG/WebP, ~1600 px on the long edge, under ~400 KB each.
The Instagram feed (`instagram.com/imohammad.musa`) is login-walled to bots, so images
have to be exported from the account and dropped in here.

### 2. Real content

- **Email:** replace `hello@mosa.af` in `index.html` (contact + showreel request)
- **Socials:** Instagram is linked; swap the Behance/Dribbble URLs (currently generic homepages)
- **Projects:** titles/descriptions/tags live in the `projects` object in `src/main.js`
- **Copy:** about text, stats (`data-count`), services and footer are in `index.html`

### 3. Design tokens

In `src/style.css`:

```css
--bg: #08080a;      /* page */
--ink: #f2f0e9;     /* type */
--acid: #d8ff3e;    /* accent */
--pad: clamp(20px, 4vw, 64px);
```

Fonts are loaded from Google Fonts: **Space Grotesk** + **Instrument Serif**.

## Deploying

`vite.config.js` sets `base: "./"`, so the build works from a subdirectory too
(GitHub Pages project sites, `file://`, etc.). Upload `dist/` to any static host:
Vercel, Netlify, Cloudflare Pages, or the `mosa.af` domain root.

If deploying to GitHub Pages for this repo, publish `dist/` on the `gh-pages` branch
(private repos need GitHub Pro for Pages).

## Notes

- Placeholder photography: [Unsplash](https://unsplash.com/license) (free to use).
- Replace `hello@mosa.af` and the placeholder case studies before sharing widely.
- The site is responsive down to 320 px and honours `prefers-reduced-motion`.
