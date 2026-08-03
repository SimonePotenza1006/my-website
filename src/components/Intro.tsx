import { useCallback, useEffect, useRef, useState } from 'react';
import { GAP, contact, preview, script, type IntroMessage } from '../data/intro';
import { Ticks, EmojiIcon, ClipIcon, MicIcon, CameraIcon, ChevronLeft } from './icons';

type Phase =
  | 'chat' // la conversazione si svolge
  | 'tap' // il dito preme sull'anteprima
  | 'arm' // il cerchio è montato ma ancora chiuso: serve un frame dipinto
  | 'reveal' // il cerchio si apre e copre lo schermo
  | 'fade' // l'overlay svanisce sul sito già in movimento
  | 'done';

/** Origine dell'espansione circolare: il centro dell'anteprima del link. */
type Origin = { x: number; y: number; r: number };

export default function Intro() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(0);
  const [typing, setTyping] = useState(false);
  const [phase, setPhase] = useState<Phase>('chat');
  const [origin, setOrigin] = useState<Origin | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  /** Sgancia l'intro e lascia il sito al visitatore. */
  const finish = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    document.documentElement.classList.remove('intro-active');
    setPhase('done');
  }, []);

  /** Taglio di scena: il tap sul link apre il sito. */
  const cut = useCallback(() => {
    const rect = cardRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const r = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    setOrigin({ x, y, r });
    // L'overlay deve prima esistere a raggio zero ed essere dipinto: se si
    // montasse già aperto, il browser non avrebbe nulla da interpolare e il
    // cerchio comparirebbe di colpo. Due frame garantiscono lo stato iniziale.
    setPhase('arm');
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase('reveal')));

    // Il sito entra in scena mentre il cerchio è ancora chiuso sopra di lui:
    // quando l'overlay svanisce, l'animazione del contenuto è già in corso.
    after(760, () => {
      document.documentElement.classList.remove('intro-active');
      setPhase('fade');
      after(800, () => setPhase('done'));
    });
  }, [after]);

  // Lo script inline nel <head> decide se l'intro va mostrata: qui ci si limita
  // a leggerne l'esito, così server e client renderizzano lo stesso markup.
  useEffect(() => {
    if (!document.documentElement.classList.contains('intro-active')) {
      setPhase('done');
      return;
    }
    try {
      sessionStorage.setItem('intro-seen', '1');
    } catch {
      // Storage negato (navigazione privata, cookie bloccati): l'intro va in
      // scena comunque, si ripeterà al prossimo caricamento. Non è un errore.
    }
    setEnabled(true);
  }, []);

  // Svolgimento della conversazione.
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const step = (index: number) => {
      if (cancelled) return;
      if (index >= script.length) {
        setTyping(false);
        // Il link è risalito di due battute: prima lo si riporta sotto gli
        // occhi, come farebbe chiunque prima di toccarlo, poi si preme.
        after(900, () => {
          cardRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          after(650, () => {
            setPhase('tap');
            after(620, cut);
          });
        });
        return;
      }

      const message = script[index]!;
      setTyping(message.from === 'them');

      after(message.pause, () => {
        if (cancelled) return;
        setTyping(false);
        setVisible(index + 1);
        after(GAP, () => step(index + 1));
      });
    };

    step(0);

    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [enabled, after, cut]);

  // Esc salta l'intro: chi torna sul sito non deve subirla di nuovo.
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && finish();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, finish]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [visible, typing]);

  if (phase === 'done') return null;

  const shown = script.slice(0, visible);
  const revealing = phase === 'reveal' || phase === 'fade';

  return (
    <div id="intro" className="fixed inset-0 z-[100]" role="dialog" aria-label="Introduzione">
      {/* La stanza buia attorno al telefono */}
      <div className="absolute inset-0 bg-room">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background: 'radial-gradient(60% 50% at 50% 42%, #2e2e34 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative flex h-full items-center justify-center md:p-6">
        <Phone>
          <StatusBar />
          <ChatHeader />

          <div className="chat-doodles thin-scroll relative min-h-0 flex-1 overflow-y-auto bg-chat-bg">
            <div className="relative flex flex-col gap-0.5 px-3 py-3">
              {shown.map((message, index) => (
                <Bubble
                  key={index}
                  message={message}
                  index={index}
                  tail={shown[index - 1]?.from !== message.from}
                  cardRef={message.kind === 'link' ? cardRef : undefined}
                  tapped={message.kind === 'link' && phase === 'tap'}
                />
              ))}
              {typing && <TypingBubble />}
              <div ref={bottomRef} className="h-1 shrink-0" />
            </div>
          </div>

          <Composer />
        </Phone>
      </div>

      <button
        type="button"
        onClick={finish}
        className="absolute top-5 right-5 rounded-full border border-canvas/25 bg-room/60 px-4 py-2 font-mono text-xs tracking-wide text-canvas/70 backdrop-blur transition hover:border-canvas hover:text-canvas md:top-7 md:right-7"
      >
        Salta l’intro
      </button>

      {/* Il taglio: un cerchio del colore del sito che si apre dal link. */}
      {origin && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-canvas"
          style={{
            clipPath: revealing
              ? `circle(${origin.r}px at ${origin.x}px ${origin.y}px)`
              : `circle(0px at ${origin.x}px ${origin.y}px)`,
            transition: 'clip-path 700ms cubic-bezier(0.65, 0, 0.35, 1), opacity 800ms ease',
            opacity: phase === 'fade' ? 0 : 1,
          }}
        />
      )}
    </div>
  );
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-chat-bg md:h-[min(780px,86vh)] md:w-[380px] md:rounded-[44px] md:border-[10px] md:border-room md:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(237,231,218,0.12)]">
      {/* Isola dinamica: solo nella cornice desktop, su mobile c'è quella vera */}
      <div className="absolute top-2 left-1/2 z-20 hidden h-[30px] w-[104px] -translate-x-1/2 rounded-full bg-black md:block" />
      {children}
      {/* Maniglia di sistema: la disegna solo il telefono finto del desktop */}
      <div className="hidden h-6 shrink-0 items-center justify-center bg-chat-panel md:flex">
        <span className="h-[5px] w-[120px] rounded-full bg-chat-text/25" />
      </div>
    </div>
  );
}

/** Barra di stato del telefono finto: esiste solo nella cornice desktop. */
function StatusBar() {
  return (
    <div className="hidden h-[44px] shrink-0 items-end justify-between bg-chat-panel px-7 pb-1.5 text-[13px] font-semibold text-chat-text md:flex">
      <span>21:04</span>
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 18 12" width="17" height="11" aria-hidden="true">
          <g fill="currentColor">
            <rect x="0" y="8" width="3" height="4" rx="1" />
            <rect x="4.7" y="5.5" width="3" height="6.5" rx="1" />
            <rect x="9.4" y="3" width="3" height="9" rx="1" />
            <rect x="14.1" y="0" width="3" height="12" rx="1" />
          </g>
        </svg>
        <svg viewBox="0 0 26 12" width="25" height="11" aria-hidden="true">
          <rect
            x="0.5"
            y="0.5"
            width="21"
            height="11"
            rx="3"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.4"
          />
          <rect x="2" y="2" width="15" height="8" rx="1.6" fill="currentColor" />
          <path d="M23 4v4a2 2 0 000-4z" fill="currentColor" fillOpacity="0.4" />
        </svg>
      </span>
    </div>
  );
}

function ChatHeader() {
  return (
    <header className="flex h-[56px] shrink-0 items-center gap-3 bg-chat-panel px-3 text-chat-text">
      <ChevronLeft />
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chat-brand/15 text-[18px] select-none">
        {contact.avatar}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[16px] font-medium">{contact.name}</span>
        <span className="truncate text-[12px] text-chat-muted">{contact.status}</span>
      </span>
    </header>
  );
}

type BubbleProps = {
  message: IntroMessage;
  index: number;
  tail: boolean;
  cardRef?: React.RefObject<HTMLDivElement | null>;
  tapped?: boolean;
};

function Bubble({ message, index, tail, cardRef, tapped }: BubbleProps) {
  const mine = message.from === 'me';
  // Uno scambio veloce: l'orario avanza di un minuto ogni due battute.
  const minute = String(1 + Math.floor(index / 2)).padStart(2, '0');

  return (
    <div className={`bubble-pop flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          // Tutte le bolle di chi scrive condividono lo stesso bordo: solo la
          // codina della prima sporge oltre, dentro il padding del contenitore.
          'relative max-w-[80%] rounded-lg px-2.5 py-1.5 text-[14.5px] leading-[20px] text-chat-text shadow-sm',
          mine ? 'bg-chat-out' : 'bg-chat-in',
          tail && (mine ? 'bubble-out rounded-tr-none' : 'bubble-in rounded-tl-none'),
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {message.kind === 'text' && <p>{message.text}</p>}
        {message.kind === 'link' && <LinkPreview cardRef={cardRef} tapped={tapped} />}

        <span className="float-right mt-0.5 ml-2 flex translate-y-1 items-center gap-1 text-[11px] text-chat-muted">
          21:{minute}
          {mine && <Ticks />}
        </span>
      </div>
    </div>
  );
}

/** L'anteprima del link: la porta da cui si entra nel sito. */
function LinkPreview({
  cardRef,
  tapped,
}: {
  cardRef?: React.RefObject<HTMLDivElement | null>;
  tapped?: boolean;
}) {
  return (
    <div ref={cardRef} className="relative mb-1 w-[230px] overflow-hidden rounded-md bg-black/5">
      <div className="relative flex h-[112px] flex-col justify-center overflow-hidden bg-room px-3.5">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(72% 68% at 76% 70%, #3a3a42 0%, transparent 70%), linear-gradient(150deg, #26262c 0%, #0e0e10 62%)',
          }}
        />
        {/* Poggia sul bordo inferiore, come un ritaglio incollato sulla card */}
        <img
          src="/simone-preview.png"
          alt=""
          width={420}
          height={469}
          className="pointer-events-none absolute right-2 bottom-0 h-[104px] w-auto"
        />
        <span className="relative font-display text-[19px] leading-[1.05] font-extrabold tracking-tight text-canvas">
          Simone
          <br />
          Potenza
        </span>
        <span className="relative mt-1.5 font-mono text-[8.5px] tracking-[0.18em] text-line uppercase">
          Full stack
        </span>
      </div>

      <div className="px-2.5 py-2">
        <p className="text-[13.5px] leading-[18px] font-medium">{preview.title}</p>
        <p className="mt-0.5 text-[12.5px] leading-[17px] text-chat-muted">
          {preview.description}
        </p>
        <p className="mt-1 text-[12px] text-chat-muted">{preview.domain}</p>
      </div>

      {tapped && (
        <span
          aria-hidden="true"
          // Il cerchio attraversa sia il fondo scuro sia la parte bianca della
          // card: la salvia si vede su entrambi, un bianco o un nero no.
          className="tap-ring pointer-events-none absolute top-1/2 left-1/2 block size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-faint/50"
        />
      )}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start" aria-live="polite" aria-label="sta scrivendo">
      <div className="bubble-in relative rounded-lg rounded-tl-none bg-chat-in px-3 py-3 shadow-sm">
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="dot-blink block size-1.5 rounded-full bg-chat-muted"
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

function Composer() {
  return (
    <div
      className="flex shrink-0 items-center gap-2.5 bg-chat-panel px-3 py-2.5"
      // Su mobile la barra sta a filo del bordo inferiore, dove i telefoni
      // mettono la loro maniglia di sistema.
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex flex-1 items-center gap-2.5 rounded-full bg-white px-3 py-2">
        <EmojiIcon />
        <span className="flex-1 text-[15px] text-chat-muted select-none">Messaggio</span>
        <ClipIcon />
        <CameraIcon />
      </div>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chat-brand text-white">
        <MicIcon />
      </span>
    </div>
  );
}
