/**
 * I lavori mostrati nella griglia filtrabile.
 * TODO: descrizioni e link sono da verificare — i nomi vengono dalle cartelle
 * dei tuoi progetti, il resto sono ipotesi mie.
 */

export type Project = {
  name: string;
  year: string;
  role: string;
  summary: string;
  tags: string[];
  href?: string;
};

export const projects: Project[] = [
  {
    name: 'Critical Table',
    year: '2024',
    role: 'Progetto personale',
    summary:
      'Strumento per sessioni di gioco di ruolo da tavolo. Un back end che regge la logica di gioco e due client, web e mobile, che parlano la stessa API.',
    tags: ['Node.js', 'PostgreSQL', 'API', 'Web'],
  },
  {
    name: 'Critical Table Mobile',
    year: '2024',
    role: 'Progetto personale',
    summary:
      'Il client Flutter dello stesso prodotto: schede personaggio e tiri di dado al tavolo, con lo stato sincronizzato fra i giocatori.',
    tags: ['Flutter', 'Mobile', 'API'],
  },
  {
    name: 'Linda',
    year: '2025',
    role: 'Progetto personale',
    summary:
      'App per fare pulizia nella galleria fotografica. Nata da un problema mio: dodicimila foto e nessuna voglia di scorrerle a una a una.',
    tags: ['Flutter', 'Mobile'],
  },
  {
    name: 'Listino Prezzi',
    year: '2025',
    role: 'Su commissione',
    summary:
      'Gestionale su misura per un’attività che lavorava a fogli di calcolo. Piccolo, ma con un utente vero che ti scrive quando qualcosa non torna.',
    tags: ['Web', 'PostgreSQL', 'Node.js'],
  },
  {
    name: 'Questo sito',
    year: '2026',
    role: 'Progetto personale',
    summary:
      'Portfolio con un’introduzione giocata come una conversazione. Astro con isole React, contenuti tipizzati, nessun tracciamento invasivo.',
    tags: ['Astro', 'React', 'Web'],
    href: 'https://github.com/SimonePotenza1006/my-website',
  },
];

/** Le etichette dei filtri, nell'ordine in cui compaiono nei progetti. */
export const tags = [...new Set(projects.flatMap((project) => project.tags))];
