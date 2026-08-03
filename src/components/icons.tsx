/**
 * Icone dell'interfaccia del telefono, ridisegnate a mano: forme generiche
 * (spunte, graffetta, microfono) e non asset presi da un'app esistente.
 * Usano tutte `currentColor`, così il colore lo decide chi le monta.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Doppia spunta di lettura: il dettaglio che rende riconoscibile una chat. */
export function Ticks() {
  return (
    <svg viewBox="0 0 18 12" width="16" height="11" aria-hidden="true" className="text-chat-tick">
      <path d="M1 6.6l3 3L10.4 1.4" {...stroke} strokeWidth={1.6} />
      <path d="M6.6 6.6l3 3L16 1.4" {...stroke} strokeWidth={1.6} />
    </svg>
  );
}

export function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="text-chat-brand">
      <path d="M15 5l-7 7 7 7" {...stroke} strokeWidth={2} />
    </svg>
  );
}

export function EmojiIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="text-chat-muted">
      <circle cx="12" cy="12" r="9" {...stroke} />
      <path d="M8.5 14.5a4.5 4.5 0 007 0M9 9.5v.01M15 9.5v.01" {...stroke} />
    </svg>
  );
}

export function ClipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="text-chat-muted">
      <path
        d="M16.5 6.5v9a4.5 4.5 0 01-9 0V6a3 3 0 016 0v9a1.5 1.5 0 01-3 0V7"
        {...stroke}
      />
    </svg>
  );
}

export function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="text-chat-muted">
      <path d="M3 8.5A2.5 2.5 0 015.5 6h1.7l1.3-2h6l1.3 2h1.7A2.5 2.5 0 0120 8.5v8A2.5 2.5 0 0117.5 19h-11A2.5 2.5 0 014 16.5z" {...stroke} />
      <circle cx="12" cy="12.5" r="3.5" {...stroke} />
    </svg>
  );
}

export function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" {...stroke} />
      <path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3" {...stroke} />
    </svg>
  );
}
