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
  name: 'Bro 🔥',
  avatar: '🔥',
  status: 'online',
} as const;

export const preview = {
  domain: 'simonepotenza.dev',
  title: 'Simone Potenza — Full stack developer',
  description: 'Front end, back end e tutto quello che sta in mezzo.',
} as const;

export const script: IntroMessage[] = [
  {
    from: 'me',
    kind: 'text',
    text: 'Mi serve una mano, conosci qualche sviluppatore?',
    pause: 600,
  },
  {
    from: 'them',
    kind: 'text',
    text: 'Ti sei convinto a fare il sito web per la tua casa vacanze? 👀',
    pause: 1300,
  },
  {
    from: 'me',
    kind: 'text',
    text: 'Ahahahahahahah quella arriverà un giorno, ma ho avuto un’idea per un’applicazione mobile e voglio parlarne con un professionista!',
    pause: 1100,
  },
  { from: 'them', kind: 'text', text: 'Allora conosco la persona perfetta!', pause: 1300 },
  { from: 'them', kind: 'link', pause: 1000 },
  {
    from: 'them',
    kind: 'text',
    text: 'Dagli un colpo di telefono, magari ti sistema anche per il sito 😂',
    pause: 1200,
  },
  { from: 'me', kind: 'text', text: 'Grazie mille, vedo subito!', pause: 900 },
];

/** Respiro tra una bolla e l'inizio della successiva. */
export const GAP = 280;
