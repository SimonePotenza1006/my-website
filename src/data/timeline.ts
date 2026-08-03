/**
 * Il percorso, in ordine cronologico.
 * TODO: tutto segnaposto. Servono anni, ruoli e aziende veri — una timeline
 * con le date sbagliate è peggio che non averla.
 */

export type Milestone = {
  year: string;
  title: string;
  body: string;
};

export const milestones: Milestone[] = [
  {
    year: '2019',
    title: 'La prima riga che ha fatto qualcosa',
    body: '[Da riempire] Dove hai iniziato, e cosa ti ha convinto che valeva la pena continuare.',
  },
  {
    year: '2021',
    title: 'Dal front end al resto',
    body: '[Da riempire] Il momento in cui hai smesso di fermarti all’interfaccia e sei andato a vedere cosa c’era sotto.',
  },
  {
    year: '2023',
    title: 'Il primo utente vero',
    body: '[Da riempire] Il primo progetto usato da qualcuno che non eri tu, e cosa ti ha insegnato.',
  },
  {
    year: '2025',
    title: 'Tre codebase, una sola API',
    body: '[Da riempire] Critical Table portato su web e mobile, e il mestiere di far combaciare i pezzi.',
  },
  {
    year: '2026',
    title: 'Adesso',
    body: '[Da riempire] Cosa stai cercando e con chi vuoi lavorare.',
  },
];
