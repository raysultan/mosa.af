import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { initHeroScene } from "./three/scene.js";

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ------------------------------------------------------------------ */
/*  Loader                                                             */
/* ------------------------------------------------------------------ */

function runLoader() {
  return new Promise((resolve) => {
    const loader = $("#loader");
    const countEl = $("#loader-count");
    const bar = $("#loader-bar");
    if (!loader || !countEl || !bar) return resolve();

    const startedAt = performance.now();
    let shown = 0;
    let ready = false;
    let finished = false;

    const markReady = () => { ready = true; };
    if (document.readyState === "complete") markReady();
    else window.addEventListener("load", markReady, { once: true });
    if (document.fonts?.ready) document.fonts.ready.then(markReady);
    window.setTimeout(markReady, 4500); // never trap the page

    const finish = () => {
      if (finished) return;
      finished = true;
      countEl.textContent = "100";
      bar.style.width = "100%";
      document.documentElement.classList.remove("is-loading");
      document.body.classList.add("is-loaded");
      loader.classList.add("is-done");
      window.setTimeout(() => loader.remove(), 1200);
      resolve();
    };

    const tick = (now) => {
      const elapsed = now - startedAt;
      const creep = Math.min(90, (elapsed / 1150) * 90);
      const goal = ready ? 100 : creep;
      shown += (goal - shown) * 0.12;
      if (goal >= 100 && shown > 99.4) shown = 100;

      countEl.textContent = String(Math.min(99, Math.floor(shown))).padStart(2, "0");
      bar.style.width = `${shown}%`;

      if (shown >= 100 && elapsed > 700) {
        finish();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/* ------------------------------------------------------------------ */
/*  Scroll + reveals                                                   */
/* ------------------------------------------------------------------ */

function initScroll() {
  if (reduceMotion) {
    initAnchors(null);
    return null;
  }

  document.documentElement.classList.add("lenis-enabled");

  const lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.6,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  initAnchors(lenis);
  return lenis;
}

function initAnchors(lenis) {
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.35, offset: -4 });
      else target.scrollIntoView({ behavior: "auto" });
    });
  });
}

function initReveals() {
  if (reduceMotion) {
    $$("[data-count]").forEach((el) => {
      el.textContent = el.dataset.count;
    });
    return;
  }

  $$(".reveal").forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 32 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      }
    );
  });

  $$(".split").forEach((el) => {
    let split;
    try {
      split = new SplitText(el, {
        type: "lines",
        mask: "lines",
        linesClass: "split-line",
      });
    } catch (err) {
      return;
    }
    gsap.set(split.lines, { yPercent: 115 });
    ScrollTrigger.create({
      trigger: el,
      start: "top 86%",
      once: true,
      onEnter: () =>
        gsap.to(split.lines, {
          yPercent: 0,
          duration: 1.15,
          stagger: 0.09,
          ease: "expo.out",
        }),
    });
  });

  $$("[data-count]").forEach((el) => {
    const end = Number(el.dataset.count) || 0;
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 92%",
      once: true,
      onEnter: () =>
        gsap.to(obj, {
          v: end,
          duration: 1.8,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = Math.round(obj.v);
          },
        }),
    });
  });

  // gentle image parallax
  $$("[data-parallax]").forEach((img) => {
    const wrap = img.closest("[data-parallax-wrap]") || img;
    gsap.fromTo(
      img,
      { yPercent: -5, scale: 1.14 },
      {
        yPercent: 5,
        scale: 1.14,
        ease: "none",
        scrollTrigger: {
          trigger: wrap,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
  });

  // hero copy drifts away
  gsap.to(".hero__inner", {
    yPercent: -7,
    opacity: 0.3,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: 0.5,
    },
  });

  // motion frames drift with scroll
  const strip = $(".strip__track");
  if (strip) {
    gsap.fromTo(
      strip,
      { xPercent: -4 },
      {
        xPercent: -30,
        ease: "none",
        scrollTrigger: {
          trigger: ".strip",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.1,
        },
      }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Pointer flourishes                                                 */
/* ------------------------------------------------------------------ */

function initCursor() {
  if (!finePointer) return;
  const cursor = $(".cursor");
  const dot = $(".cursor__dot");
  const ring = $(".cursor__ring");
  if (!cursor || !dot || !ring) return;

  document.body.classList.add("has-cursor");

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;

  window.addEventListener(
    "pointermove",
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
    },
    { passive: true }
  );

  gsap.ticker.add(() => {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
  });

  $$("a, button, [data-cursor]").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      if (el.dataset.cursor === "view") cursor.classList.add("is-view");
      else cursor.classList.add("is-hover");
    });
    el.addEventListener("pointerleave", () => {
      cursor.classList.remove("is-hover", "is-view");
    });
  });

  document.addEventListener("mouseleave", () => cursor.classList.add("is-hidden"));
  document.addEventListener("mouseenter", () => cursor.classList.remove("is-hidden"));
}

function initMagnetic() {
  if (!finePointer || reduceMotion) return;
  $$("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, {
        x: (e.clientX - (r.left + r.width / 2)) * 0.2,
        y: (e.clientY - (r.top + r.height / 2)) * 0.3,
        duration: 0.5,
        ease: "power2.out",
      });
    });
    el.addEventListener("pointerleave", () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.35)" });
    });
  });
}

function initTilt() {
  if (!finePointer || reduceMotion) return;
  $$("[data-tilt]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(el, {
        rotationY: nx * 6,
        rotationX: -ny * 6,
        transformPerspective: 1000,
        duration: 0.6,
        ease: "power2.out",
      });
    });
    el.addEventListener("pointerleave", () => {
      gsap.to(el, { rotationX: 0, rotationY: 0, duration: 0.9, ease: "expo.out" });
    });
  });
}

function initServicePreview() {
  const preview = $(".service-preview");
  if (!preview || !finePointer) return;
  const img = $("img", preview);
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let tx = x;
  let ty = y;

  window.addEventListener(
    "pointermove",
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
    },
    { passive: true }
  );

  gsap.ticker.add(() => {
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;
    preview.style.left = `${x}px`;
    preview.style.top = `${y}px`;
  });

  $$(".service").forEach((row) => {
    if (!row.dataset.preview) return;
    row.addEventListener("pointerenter", () => {
      img.src = row.dataset.preview;
      preview.classList.add("is-active");
    });
    row.addEventListener("pointerleave", () => preview.classList.remove("is-active"));
  });
}

/* ------------------------------------------------------------------ */
/*  Chrome: nav, clock, progress                                       */
/* ------------------------------------------------------------------ */

function updateClock() {
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kabul",
  }).format(new Date());

  const clock = $("#clock");
  const heroTime = $("#hero-time");
  if (clock) clock.textContent = time;
  if (heroTime) heroTime.textContent = time;
}

function initChrome() {
  const nav = $("#nav");
  const bar = $("#progress-bar");

  const onScroll = () => {
    const y = window.scrollY;
    if (nav) nav.classList.toggle("is-scrolled", y > 50);
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = `${Math.min(100, (y / Math.max(1, max)) * 100)}%`;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  updateClock();
  window.setInterval(updateClock, 20000);
}

/* ------------------------------------------------------------------ */
/*  Projects + modal                                                   */
/* ------------------------------------------------------------------ */

const projects = {
  nova: {
    title: "NOVA",
    cat: "Brand Identity — 2026",
    img: "work/work-01.jpg",
    desc: "A full identity for a streetwear label built around contrast: sharp geometry, generous negative space and a wordmark that stretches across everything from woven labels to 20-metre banners.",
    tags: ["Identity", "Logotype", "Guidelines", "Art direction"],
    client: "NOVA Studio",
    year: "2026",
    role: "Design lead",
  },
  kinetic: {
    title: "Kinetic Bloom",
    cat: "Motion / 3D — 2025",
    img: "work/work-02.jpg",
    desc: "A generative motion system for a digital festival — blooming shapes, chromatic gradients and type that behaves like liquid. Delivered as a toolkit of loops for screens, socials and stage visuals.",
    tags: ["Motion system", "3D", "Kinetic type", "Toolkit"],
    client: "Bloom Festival",
    year: "2025",
    role: "Motion & 3D",
  },
  halcyon: {
    title: "Halcyon",
    cat: "Packaging — 2025",
    img: "work/work-03.jpg",
    desc: "Quiet, tactile packaging for a small-batch tea house. A restrained palette, a custom serif and embossed details that reward the person holding the box.",
    tags: ["Packaging", "Print", "Typography", "Production"],
    client: "Halcyon Tea",
    year: "2025",
    role: "Identity & packaging",
  },
  frequency: {
    title: "Static / Frequency",
    cat: "Graphics — 2025",
    img: "work/work-04.jpg",
    desc: "A self-initiated poster series exploring interference, repetition and the beauty of a signal falling apart. Printed as a limited run of 50, risograph on 300gsm stock.",
    tags: ["Poster series", "Risograph", "Type", "Self-initiated"],
    client: "Self-initiated",
    year: "2025",
    role: "Design & print",
  },
  orbis: {
    title: "Orbis",
    cat: "3D / CGI — 2024",
    img: "work/work-05.jpg",
    desc: "Product visualisation for a boutique audio brand. Soft studio light, impossible materials and camera moves that make a small object feel monumental.",
    tags: ["3D", "Product", "Lighting", "Animation"],
    client: "Orbis Audio",
    year: "2024",
    role: "3D artist",
  },
  souq: {
    title: "Neon Souq",
    cat: "Campaign — 2024",
    img: "work/work-06.jpg",
    desc: "A launch campaign that collides old-city textures with electric colour. Art direction, key visuals and a set of animated cutdowns for out-of-home and social.",
    tags: ["Campaign", "Art direction", "Motion", "OOH"],
    client: "Souq District",
    year: "2024",
    role: "Art direction",
  },
};

function initProjects() {
  const modal = $("#project-modal");
  if (!modal) return;

  const img = $("#modal-img");
  const cat = $("#modal-cat");
  const title = $("#modal-title");
  const desc = $("#modal-desc");
  const tags = $("#modal-tags");
  const client = $("#modal-client");
  const year = $("#modal-year");
  const role = $("#modal-role");
  const closeBtn = $(".modal__close", modal);

  let lastFocus = null;

  const open = (id) => {
    const data = projects[id];
    if (!data) return;
    lastFocus = document.activeElement;

    img.src = data.img;
    img.alt = `${data.title} — ${data.cat}`;
    cat.textContent = data.cat;
    title.textContent = data.title;
    desc.textContent = data.desc;
    client.textContent = data.client;
    year.textContent = data.year;
    role.textContent = data.role;
    tags.replaceChildren(
      ...data.tags.map((tag) => {
        const li = document.createElement("li");
        li.textContent = tag;
        return li;
      })
    );

    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    if (window.__lenis) window.__lenis.stop();
    gsap.fromTo(
      ".modal__content > *",
      { y: 18, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.05, ease: "expo.out", delay: 0.12 }
    );
    window.setTimeout(() => closeBtn?.focus(), 60);
  };

  const close = () => {
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (window.__lenis) window.__lenis.start();
    lastFocus?.focus?.();
  };

  $$("[data-project]").forEach((btn) => {
    btn.addEventListener("click", () => open(btn.dataset.project));
  });

  $$("[data-close]", modal).forEach((el) => el.addEventListener("click", close));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") close();
  });
}

/* ------------------------------------------------------------------ */
/*  Boot                                                               */
/* ------------------------------------------------------------------ */

async function boot() {
  const hero = initHeroScene();

  await runLoader();
  hero.start();

  const lenis = initScroll();
  window.__lenis = lenis;

  initChrome();
  initCursor();
  initMagnetic();
  initTilt();
  initServicePreview();
  initReveals();
  initProjects();

  // images that finish loading late can shift layout
  window.addEventListener("load", () => ScrollTrigger.refresh());
  ScrollTrigger.refresh();
}

boot().catch((err) => {
  console.error("[mosa.af] boot failed:", err);
  document.documentElement.classList.remove("is-loading");
  document.body.classList.add("is-loaded");
  $("#loader")?.remove();
});
