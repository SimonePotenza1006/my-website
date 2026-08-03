/**
 * Domande frequenti.
 * TODO: le risposte sono plausibili ma non sono tue — rileggile e riscrivile
 * con le condizioni che davvero accetti.
 */

export type Question = {
  q: string;
  a: string;
};

export const questions: Question[] = [
  {
    q: 'Lavori sia sul front end che sul back end?',
    a: 'Sì, ed è il motivo per cui di solito mi cercano. Posso prendere in carico un prodotto intero senza che tu debba coordinare due fornitori che si rimpallano la colpa quando qualcosa non funziona.',
  },
  {
    q: 'Da cosa parti quando ti arriva un progetto?',
    a: 'Da cosa deve fare, non da come deve essere fatto. Prima capiamo chi lo userà e quali sono i due o tre passaggi che contano davvero, poi si sceglie la tecnologia. Farlo al contrario è il modo più rapido per costruire la cosa sbagliata bene.',
  },
  {
    q: 'Quanto ci vuole?',
    a: 'Dipende dalla superficie, non dalla complessità: un gestionale con quattro schermate si fa in poche settimane, uno con quaranta no. Dopo una chiamata riesco a darti una forbice onesta invece di un numero inventato.',
  },
  {
    q: 'Ti occupi anche del rilascio e della manutenzione?',
    a: 'Sì. Un progetto consegnato e mai messo online non serve a nessuno, quindi deploy, dominio e aggiornamenti fanno parte del lavoro, non sono un extra a sorpresa.',
  },
  {
    q: 'Puoi mettere mano a qualcosa già scritto da altri?',
    a: 'Spesso sì. Prima però guardo il codice e ti dico onestamente se conviene sistemarlo o rifarlo: a volte la manutenzione di un progetto messo male costa più della riscrittura.',
  },
];
