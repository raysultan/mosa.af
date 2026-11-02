import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/* Hero WebGL: a displaced, iridescent shader blob with orbit rings,
   drifting particles and bloom. Reacts to pointer + scroll. */

export function initHeroScene() {
  const canvas = document.getElementById("webgl");
  if (!canvas) return { start() {} };

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = window.matchMedia("(max-width: 768px)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch (err) {
    document.body.classList.add("no-webgl");
    return { start() {} };
  }

  const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.8);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x08080a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(0, 0, 5.5);

  const group = new THREE.Group();
  scene.add(group);

  const isDesktop = window.innerWidth > 900;
  const baseY = isDesktop ? 0.02 : 0.08;
  if (isDesktop) {
    group.position.set(1.45, baseY, 0);
    group.scale.setScalar(0.92);
  } else {
    group.position.set(0.52, baseY, 0);
    group.scale.setScalar(0.78);
  }

  /* ---------- backdrop gradient ---------- */

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 22),
    new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: {
        uA: { value: new THREE.Color("#07060b") },
        uB: { value: new THREE.Color("#150b30") },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uA;
        uniform vec3 uB;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv - 0.5;
          float d = length(p * vec2(1.05, 1.5));
          vec3 col = mix(uB, uA, smoothstep(0.1, 0.72, d));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  );
  backdrop.position.z = -7;
  scene.add(backdrop);

  /* ---------- blob ---------- */

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uColorA: { value: new THREE.Color("#100626") },
    uColorB: { value: new THREE.Color("#3b1a8a") },
    uColorC: { value: new THREE.Color("#d8ff3e") },
  };

  const blobMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uMouse;
      varying vec3 vNormal;
      varying vec3 vView;
      varying float vDisp;

      void main() {
        vec3 p = position;
        float t = uTime;
        float n1 = sin(p.x * 2.2 + t * 0.7) * cos(p.y * 2.0 - t * 0.5) * sin(p.z * 1.8 + t * 0.6);
        float n2 = sin(p.y * 4.6 - t * 1.1) * cos(p.z * 4.2 + t * 0.9) * sin(p.x * 3.7 + t * 0.8);
        float n3 = sin((p.x + p.y + p.z) * 1.35 + t * 1.3);
        float disp = n1 * 0.22 + n2 * 0.055 + n3 * 0.02;
        disp += uMouse.x * 0.06 * sin(p.y * 3.0 + t);
        p += normal * disp;

        vDisp = disp;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vView = -mv.xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vView;
      varying float vDisp;

      void main() {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(vView);
        float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.0);
        float grad = smoothstep(-0.34, 0.34, vDisp);
        vec3 col = mix(uColorA, uColorB, grad);
        col = mix(col, uColorC, fres * 0.9);

        float band = sin(vDisp * 20.0 + N.y * 5.0 + uTime * 0.45) * 0.5 + 0.5;
        col += uColorC * band * 0.07;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const blob = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, small ? 4 : 6),
    blobMat
  );
  group.add(blob);

  /* ---------- wireframe shell ---------- */

  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.02, 1),
    new THREE.MeshBasicMaterial({
      color: 0x8a76ff,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    })
  );
  group.add(shell);

  /* ---------- orbit rings ---------- */

  const ringColors = [0xd8ff3e, 0x8a76ff, 0xd8ff3e];
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.05 + i * 0.32, 0.0055, 8, 220),
      new THREE.MeshBasicMaterial({
        color: ringColors[i],
        transparent: true,
        opacity: i === 1 ? 0.3 : 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring.rotation.set(
      Math.PI * 0.5 + (i - 1) * 0.5,
      Math.PI * 0.18 * i,
      Math.PI * 0.22 * i
    );
    group.add(ring);
    rings.push(ring);
  }

  /* ---------- particles ---------- */

  const count = small ? 380 : 760;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 2.1 + Math.random() * 2.6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeo,
    new THREE.PointsMaterial({
      size: small ? 0.028 : 0.022,
      color: 0xb6c0ff,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
  );
  group.add(particles);

  /* ---------- post processing ---------- */

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(dpr);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    small ? 0.5 : 0.62,
    0.8,
    0.18
  );
  composer.addPass(bloom);

  /* ---------- sizing ---------- */

  const host = canvas.parentElement;

  function resize() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
  }
  resize();

  const ro = new ResizeObserver(resize);
  ro.observe(host);

  /* ---------- interaction ---------- */

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const scroll = { p: 0, tp: 0 };

  function onPointer(e) {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = -(e.clientY / window.innerHeight) * 2 + 1;
  }
  function onScroll() {
    const h = Math.max(1, host.clientHeight);
    scroll.tp = Math.min(1, Math.max(0, window.scrollY / h));
  }

  if (!reduce) {
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- loop ---------- */

  const clock = new THREE.Clock();
  let started = false;
  let raf = 0;

  function frame() {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;

    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    uniforms.uTime.value = t;

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    uniforms.uMouse.value.set(pointer.x, pointer.y);

    scroll.p += (scroll.tp - scroll.p) * 0.08;

    group.rotation.y = t * 0.09 + pointer.x * 0.32 + scroll.p * 0.5;
    group.rotation.x = pointer.y * 0.18 + scroll.p * 0.45;
    group.position.y = baseY + scroll.p * 2.1;

    shell.rotation.y -= dt * 0.12;
    shell.rotation.x += dt * 0.05;
    particles.rotation.y += dt * 0.04;
    particles.rotation.x -= dt * 0.015;
    rings.forEach((ring, i) => {
      ring.rotation.z += dt * (0.12 + i * 0.05);
      ring.rotation.y += dt * 0.03 * (i % 2 ? -1 : 1);
    });

    camera.position.x += (pointer.x * 0.32 - camera.position.x) * 0.04;
    camera.position.y += (-pointer.y * 0.2 - camera.position.y) * 0.04;
    camera.position.z = 5.5 + scroll.p * 1.4;
    camera.lookAt(0, 0, 0);

    // Once the hero is well out of view, keep the frame cheap.
    if (window.scrollY > host.clientHeight * 1.2) return;

    composer.render();
  }

  if (reduce) {
    uniforms.uTime.value = 0.8;
    composer.render();
  }

  function start() {
    if (started || reduce) return;
    started = true;
    clock.start();
    frame();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (started && !raf) {
      frame();
    }
  });

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    document.body.classList.add("no-webgl");
  });

  return { start };
}
