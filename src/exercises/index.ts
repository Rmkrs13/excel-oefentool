import type { Exercise } from './types';
import { les1Evaluatie } from './les1-evaluatie';
import { absRel } from './abs-rel';
import { functiesNesten } from './functies-nesten';
import { les2Als } from './les2-als';
import { les2Zoeken } from './les2-zoeken';
import { les2Totaal } from './les2-totaal';

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  exercises: Exercise[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'les1',
    title: 'Les 1',
    description: 'Tekst en getallen, getalnotaties, vulgreep, SOM, GEMIDDELDE, MEDIAAN, MIN, MAX, AFRONDEN genest, absoluut en relatief verwijzen.',
    exercises: [les1Evaluatie, absRel, functiesNesten],
  },
  {
    id: 'les2',
    title: 'Les 2',
    description: 'De functie ALS (ook genest), opzoeken met X.ZOEKEN en VERT.ZOEKEN, en rekenen met cellen op andere tabbladen.',
    exercises: [les2Als, les2Zoeken, les2Totaal],
  },
];

export const EXERCISES: Exercise[] = LESSONS.flatMap((l) => l.exercises);
