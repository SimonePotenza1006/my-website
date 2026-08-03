import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

/** Dal più chiaro al più scuro: l'indice viene dalla luminanza della cella. */
const RAMP = ' .:-=+*#%@';

/** Celle in pixel logici. Il rapporto segue l'avanzamento di un monospazio. */
const CELL_W = 5;
const CELL_H = 8;

const TURN_ON_MS = 1200;
const TURN_OFF_MS = 480;
/** Righe su cui si sfuma il fronte di decodifica che scende. */
const FRONT_SOFT = 9;
/** Raggio in pixel entro cui il cursore riporta a galla la foto. */
const REVEAL_RADIUS = 104;
/** Dopo questa inattività parte l'onda che scopre il volto da sola. */
const IDLE_AFTER_MS = 2600;

type Grid = {
  cols: number;
  rows: number;
  lum: Float32Array;
  alpha: Float32Array;
};

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const smoothstep = (n: number) => n * n * (3 - 2 * n);

export default function AsciiPortrait({ src, width, height, alt }: Props) {
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gridRef = useRef<Grid | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const pointerRef = useRef({ x: 0, y: 0, inside: false, movedAt: 0 });
  const progressRef = useRef(0);
  const activeRef = useRef(false);
  const frameRef = useRef(0);
  const reducedRef = useRef(false);
  const colorsRef = useRef({
    canvas: '#131318',
    glyph: '#4dff9b',
    ghostA: '#ff3da5',
    ghostB: '#3fe0ff',
    mono: 'monospace',
  });

  /**
   * Riduce l'immagine alla risoluzione della griglia e ne estrae luminanza e
   * copertura per cella. Lo fa il browser nel ridimensionamento, quindi ogni
   * cella è già la media dei pixel che rappresenta.
   */
  const buildGrid = useCallback((image: HTMLImageElement, w: number, h: number) => {
    const cols = Math.max(12, Math.ceil(w / CELL_W));
    const rows = Math.max(12, Math.ceil(h / CELL_H));

    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const octx = off.getContext('2d', { willReadFrequently: true });
    if (!octx) return;

    octx.drawImage(image, 0, 0, cols, rows);
    const { data } = octx.getImageData(0, 0, cols, rows);

    const lum = new Float32Array(cols * rows);
    const alpha = new Float32Array(cols * rows);
    for (let i = 0; i < cols * rows; i += 1) {
      const o = i * 4;
      alpha[i] = data[o + 3]! / 255;
      lum[i] = (0.299 * data[o]! + 0.587 * data[o + 1]! + 0.114 * data[o + 2]!) / 255;
    }

    gridRef.current = { cols, rows, lum, alpha };
  }, []);

  const resize = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const image = imgRef.current;
    if (!wrap || !canvas || !image || !image.complete) return;

    const w = Math.round(wrap.clientWidth);
    const h = Math.round(wrap.clientHeight);
    if (!w || !h) return;

    sizeRef.current = { w, h };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildGrid(image, w, h);
    setReady(true);
  }, [buildGrid]);

  const draw = useCallback((now: number) => {
    const grid = gridRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const { w, h } = sizeRef.current;
    if (!grid || !canvas || !ctx || !w) return;

    // Avanzamento verso lo stato acceso o spento.
    const target = activeRef.current ? 1 : 0;
    const span = activeRef.current ? TURN_ON_MS : TURN_OFF_MS;
    const step = 16.7 / span;
    if (reducedRef.current) {
      progressRef.current = target;
    } else if (progressRef.current < target) {
      progressRef.current = Math.min(target, progressRef.current + step);
    } else if (progressRef.current > target) {
      progressRef.current = Math.max(target, progressRef.current - step);
    }

    const p = progressRef.current;
    ctx.clearRect(0, 0, w, h);

    if (p <= 0.001) {
      frameRef.current = 0;
      return;
    }

    const { cols, rows, lum, alpha } = grid;
    const { canvas: bg, glyph: glyphColor, ghostA, ghostB, mono } = colorsRef.current;
    const cellW = w / cols;
    const cellH = h / rows;

    ctx.font = `${Math.round(cellH * 1.06)}px ${mono}`;
    ctx.textBaseline = 'top';

    // Il fronte di decodifica scende, e nei primi istanti l'immagine si strappa
    // in bande: è lo scarto tra la copertura e la foto sotto a farlo vedere.
    const front = p * (rows + FRONT_SOFT);
    const tear = reducedRef.current ? 0 : Math.max(0, 1 - p / 0.38);
    const jitterStep = Math.floor(now / 70);
    const ghostShift = tear * 4;

    const pointer = pointerRef.current;
    const idle =
      activeRef.current && !reducedRef.current && now - pointer.movedAt > IDLE_AFTER_MS;
    const waveY = idle ? ((now / 6) % (h + 260)) - 130 : 0;

    for (let r = 0; r < rows; r += 1) {
      const y = r * cellH;
      const cy = y + cellH / 2;

      const sweep = clamp01((front - r) / FRONT_SOFT);
      if (sweep <= 0.001) continue;

      let rowShift = 0;
      if (tear > 0) {
        const seed = (r * 73 + jitterStep * 131) % 997;
        rowShift = ((seed / 997) * 2 - 1) * 18 * tear;
      }

      const waveReveal = idle ? clamp01(1 - Math.abs(cy - waveY) / 80) * 0.85 : 0;

      for (let c = 0; c < cols; c += 1) {
        const i = r * cols + c;
        const coverage = alpha[i]!;
        if (coverage < 0.12) continue;

        const x = c * cellW;

        let reveal = waveReveal;
        if (pointer.inside) {
          const dx = pointer.x - (x + cellW / 2);
          const dy = pointer.y - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          // Il fattore 1.5 crea un centro completamente scoperto invece di un
          // gradiente uniforme: serve una finestra sul volto, non una nebbia.
          const near = smoothstep(clamp01((1 - d / REVEAL_RADIUS) * 1.5));
          if (near > reveal) reveal = near;
        }

        const ascii = sweep * (1 - reveal);
        if (ascii < 0.02) continue;

        // La copertura nasconde la foto; sfumandola, la foto riaffiora.
        ctx.globalAlpha = ascii;
        ctx.fillStyle = bg;
        ctx.fillRect(x + rowShift, y, cellW + 0.6, cellH + 0.6);

        const shade = clamp01(1 - lum[i]!);
        const glyph = RAMP[Math.min(RAMP.length - 1, Math.floor(shade * RAMP.length))]!;
        if (glyph !== ' ') {
          const strength = ascii * Math.min(1, coverage * 1.4);

          // Sdoppiamento cromatico: solo durante lo strappo. Tenerlo acceso
          // sempre triplicherebbe i disegni di testo a ogni fotogramma, e sono
          // già quasi seimila celle.
          if (ghostShift > 0.2) {
            ctx.globalAlpha = strength * 0.5;
            ctx.fillStyle = ghostA;
            ctx.fillText(glyph, x + rowShift - ghostShift, y);
            ctx.fillStyle = ghostB;
            ctx.fillText(glyph, x + rowShift + ghostShift, y);
          }

          ctx.globalAlpha = strength;
          ctx.fillStyle = glyphColor;
          ctx.fillText(glyph, x + rowShift, y);
        }
      }
    }

    ctx.globalAlpha = 1;
    frameRef.current = requestAnimationFrame(draw);
  }, []);

  const kick = useCallback(() => {
    if (!frameRef.current) frameRef.current = requestAnimationFrame(draw);
  }, [draw]);

  // Colori e font presi dal tema: la palette resta definita in un posto solo.
  // Il canvas non si accorge da sé che il CSS è cambiato, quindi li rilegge
  // all'evento emesso dall'interruttore chiaro/scuro.
  const readColors = useCallback(() => {
    const styles = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    colorsRef.current = {
      canvas: read('--color-canvas', '#131318'),
      glyph: read('--color-lime', '#4dff9b'),
      ghostA: read('--color-fuchsia', '#ff3da5'),
      ghostB: read('--color-cyan', '#3fe0ff'),
      mono: read('--font-mono', 'ui-monospace, monospace'),
    };
  }, []);

  useEffect(() => {
    readColors();
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const onThemeChange = () => {
      readColors();
      kick();
    };
    window.addEventListener('themechange', onThemeChange);
    return () => window.removeEventListener('themechange', onThemeChange);
  }, [readColors, kick]);

  useEffect(() => {
    const image = imgRef.current;
    if (!image) return;

    if (image.complete) resize();
    else image.addEventListener('load', resize, { once: true });

    const observer = new ResizeObserver(resize);
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [resize]);

  useEffect(() => {
    activeRef.current = active;
    if (active) pointerRef.current.movedAt = performance.now();
    kick();
  }, [active, kick]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      inside: true,
      movedAt: performance.now(),
    };
    kick();
  };

  const onPointerLeave = () => {
    pointerRef.current.inside = false;
    pointerRef.current.movedAt = performance.now();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        ref={wrapRef}
        // La foto finisce con un taglio netto sul petto: la maschera lo scioglie
        // nella pagina invece di lasciare una riga orizzontale.
        className="relative w-[min(78vw,420px)] touch-none select-none [mask-image:linear-gradient(to_bottom,black_68%,transparent_100%)]"
        onPointerMove={onPointerMove}
        onPointerDown={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <img
          ref={imgRef}
          src={src}
          width={width}
          height={height}
          alt={alt}
          className="block h-auto w-full"
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>

      <button
        type="button"
        onClick={() => setActive((on) => !on)}
        disabled={!ready}
        aria-pressed={active}
        className="glow-box rounded-full bg-fuchsia px-6 py-3 font-medium text-canvas transition hover:opacity-90 disabled:opacity-40"
      >
        {active ? 'Rimetti a posto' : 'Scatena la magia!'}
      </button>

      <p className="min-h-5 font-mono text-xs text-dim" aria-live="polite">
        {active ? 'Passaci sopra per rimettermi a fuoco' : ''}
      </p>
    </div>
  );
}
