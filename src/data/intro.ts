/**
 * Sceneggiatura dell'intro.
 *
 * Chi guarda il sito è `me`: è lui a chiedere un consiglio, ed è a lui che
 * arriva il link. Il passaparola è la forma di raccomandazione più credibile
 * che esista, e qui viene messa in scena invece che dichiarata.
 */

export type IntroMessage = {
  from: 'me' | 'them';
  /** Millisecondi prima che la bolla compaia (per `them` è il "sta scrivendo…"). */
  pause: number;
} & ({ kind: 'text'; text: string } | { kind: 'link' });

export const contact = {
  name: 'Marta',
  initials: 'M',
  status: 'online',
} as const;

export const preview = {
  domain: 'simonepotenza.dev',
  title: 'Simone Potenza — Full stack developer',
  description: 'Front end, back end e tutto quello che sta in mezzo.',
} as const;

export const script: IntroMessage[] = [
  { from: 'me', kind: 'text', text: 'Ciao Marta! Mi serve uno sviluppatore', pause: 600 },
  { from: 'them', kind: 'text', text: 'Per cosa?', pause: 900 },
  {
    from: 'me',
    kind: 'text',
    text: 'Il gestionale del negozio. Sito pubblico + la parte interna',
    pause: 900,
  },
  { from: 'them', kind: 'text', text: 'Allora ti serve un full stack', pause: 1100 },
  {
    from: 'them',
    kind: 'text',
    text: 'Ho la persona giusta, ci ho lavorato l’anno scorso',
    pause: 1300,
  },
  { from: 'them', kind: 'link', pause: 1200 },
  { from: 'me', kind: 'text', text: 'Perfetto, guardo subito 👀', pause: 800 },
];

/** Respiro tra una bolla e l'inizio della successiva. */
export const GAP = 280;
