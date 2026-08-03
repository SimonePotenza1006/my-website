import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  width: number;
  height: number;
  alt: string;
  name: string;
  role: string;
};

/** Alfabeto di partenza, dal più chiaro al più scuro. */
const DEFAULT_RAMP = [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'];

/** Celle in pixel logici. Il rapporto segue l'avanzamento di un monospazio. */
const CELL_W = 5;
const CELL_H = 8;

const DECODE_MS = 1250;
/** Righe su cui si sfuma il fronte di decodifica che scende. */
const FRONT_SOFT = 9;
/** Raggio in pixel entro cui il puntatore riporta a galla la foto. */
const REVEAL_RADIUS = 104;
/** Dopo questa inattività parte l'onda che scopre il volto da sola. */
const IDLE_AFTER_MS = 2600;
const MAX_INPUT = 28;

type Grid = { cols: number; rows: number; lum: Float32Array; alpha: Float32Array };

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const smoothstep = (n: number) => n * n * (3 - 2 * n);

/**
 * Quanto inchiostro copre un carattere, da 0 a 1. Serve a ordinare le lettere
 * scritte dal visitatore: una `m` va dove la foto è scura, una `i` dove è
 * chiara. Ordinandole invece per battitura il ritratto verrebbe piatto.
 */
const inkCache = new Map<string, number>();
function inkOf(char: string, font: string): number {
  const key = `${char}|${font}`;
  const cached = inkCache.get(key);
  if (cached !== undefined) return cached;

  const probe = document.createElement('canvas');
  probe.width = 16;
  probe.height = 20;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;

  ctx.font = `16px ${font}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  ctx.fillText(char, 0, 0);

  const { data } = ctx.getImageData(0, 0, 16, 20);
  let sum = 0;
  for (let i = 3; i < data.length; i += 4) sum += data[i]!;
  const value = sum / (16 * 20 * 255);

  inkCache.set(key, value);
  return value;
}

function buildRamp(text: string, font: string): string[] {
  const chars = [...new Set(text.replace(/\s+/g, '').split(''))];
  if (!chars.length) return DEFAULT_RAMP;
  const sorted = chars.sort((a, b) => inkOf(a, font) - inkOf(b, font));
  // Lo spazio in testa tiene vuote le zone più chiare: senza, il ritratto
  // diventa un rettangolo pieno e il volto sparisce.
  return [' ', ...sorted];
}

export default function AsciiPortrait({ src, width, height, alt, name, role }: Props) {
  const [text, setText] = useState('');
  const [started, setStarted] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gridRef = useRef<Grid | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const pointerRef = useRef({ x: 0, y: 0, inside: false, movedAt: 0 });
  const progressRef = useRef(0);
  const startedRef = useRef(false);
  const visibleRef = useRef(true);
  const frameRef = useRef(0);
  const reducedRef = useRef(false);
  const rampRef = useRef<string[]>(DEFAULT_RAMP);
  const colorsRef = useRef({
    canvas: '#131318',
    glyph: '#4dff9b',
    ghostA: '#ff3da5',
    ghostB: '#3fe0ff',
    mono: 'monospace',
  });

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

  const draw = useCallback((now: number) => {
    const grid = gridRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const { w, h } = sizeRef.current;
    if (!grid || !canvas || !ctx || !w) {
      frameRef.current = 0;
      return;
    }

    const target = startedRef.current ? 1 : 0;
    if (reducedRef.current) progressRef.current = target;
    else if (progressRef.current < target)
      progressRef.current = Math.min(target, progressRef.current + 16.7 / DECODE_MS);

    const p = progressRef.current;
    ctx.clearRect(0, 0, w, h);

    if (p <= 0.001) {
      frameRef.current = 0;
      return;
    }

    const { cols, rows, lum, alpha } = grid;
    const { canvas: bg, glyph: glyphColor, ghostA, ghostB, mono } = colorsRef.current;
    const ramp = rampRef.current;
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
    const idle = !reducedRef.current && now - pointer.movedAt > IDLE_AFTER_MS;
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
        const glyph = ramp[Math.min(ramp.length - 1, Math.floor(shade * ramp.length))]!;
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
    frameRef.current = visibleRef.current ? requestAnimationFrame(draw) : 0;
  }, []);

  const kick = useCallback(() => {
    if (!frameRef.current && visibleRef.current) frameRef.current = requestAnimationFrame(draw);
  }, [draw]);

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
    canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildGrid(image, w, h);
    kick();
  }, [buildGrid, kick]);

  const readColors = useCallback(() => {
    const styles = getComputedStyle(document.documentElement);
    const read = (nameOfVar: string, fallback: string) =>
      styles.getPropertyValue(nameOfVar).trim() || fallback;
    colorsRef.current = {
      canvas: read('--color-canvas', '#131318'),
      glyph: read('--color-lime', '#4dff9b'),
      ghostA: read('--color-fuchsia', '#ff3da5'),
      ghostB: read('--color-cyan', '#3fe0ff'),
      mono: read('--font-mono', 'ui-monospace, monospace'),
    };
  }, []);

  // Il canvas non si accorge da sé che il CSS è cambiato.
  useEffect(() => {
    readColors();
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const onThemeChange = () => {
      readColors();
      rampRef.current = buildRamp(text, colorsRef.current.mono);
      kick();
    };
    window.addEventListener('themechange', onThemeChange);
    return () => window.removeEventListener('themechange', onThemeChange);
  }, [readColors, kick, text]);

  useEffect(() => {
    const image = imgRef.current;
    if (!image) return;

    if (image.complete) resize();
    else image.addEventListener('load', resize, { once: true });

    const observer = new ResizeObserver(resize);
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [resize]);

  /**
   * La decodifica parte da sola, ma non mentre l'intro copre ancora lo
   * schermo: girerebbe dietro un overlay e non la vedrebbe nessuno.
   */
  useEffect(() => {
    const root = document.documentElement;
    let timer = 0;

    const begin = () => {
      timer = window.setTimeout(() => setStarted(true), 420);
    };

    if (!root.classList.contains('intro-active')) {
      begin();
      return () => window.clearTimeout(timer);
    }

    const observer = new MutationObserver(() => {
      if (!root.classList.contains('intro-active')) {
        observer.disconnect();
        begin();
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  // Fuori dallo schermo il disegno si ferma: è un ciclo a 60 fps su seimila
  // celle, non ha senso tenerlo acceso mentre si legge il resto della pagina.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry?.isIntersecting ?? true;
        if (visibleRef.current) kick();
      },
      { rootMargin: '120px' },
    );
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [kick]);

  useEffect(() => {
    startedRef.current = started;
    if (started) pointerRef.current.movedAt = performance.now();
    kick();
  }, [started, kick]);

  useEffect(() => {
    rampRef.current = buildRamp(text, colorsRef.current.mono);
    kick();
  }, [text, kick]);

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
    <div className="flex w-full flex-col items-center gap-8">
      <div
        ref={wrapRef}
        // La foto finisce con un taglio netto sul petto: la maschera lo scioglie
        // nella pagina invece di lasciare una riga orizzontale.
        className="relative w-[min(84vw,460px)] touch-none select-none [mask-image:linear-gradient(to_bottom,black_68%,transparent_100%)]"
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

      <div className="flex flex-col items-center gap-5 text-center">
        <h1 className="font-mono text-[11px] tracking-[0.28em] text-dim uppercase sm:text-xs">
          {name} <span className="text-fuchsia">·</span> {role}
        </h1>

        <label className="group flex items-center gap-2 border-b border-line pb-1.5 transition focus-within:border-lime">
          <span aria-hidden="true" className="font-mono text-sm text-lime">
            &gt;
          </span>
          <input
            type="text"
            value={text}
            maxLength={MAX_INPUT}
            onChange={(event) => setText(event.target.value)}
            placeholder="scrivi qualcosa"
            aria-label="Scrivi delle lettere per ridisegnare il ritratto"
            className="w-[15ch] bg-transparent font-mono text-sm text-fg caret-lime placeholder:text-dim/70 focus:outline-none sm:w-[22ch]"
          />
        </label>

        <p className="max-w-xs font-mono text-[11px] leading-relaxed text-dim">
          {text
            ? `Ritratto disegnato con ${[...new Set(text.replace(/\s+/g, ''))].length} lettere tue`
            : 'Le lettere che scrivi diventano l’alfabeto del ritratto'}
        </p>
      </div>
    </div>
  );
}
