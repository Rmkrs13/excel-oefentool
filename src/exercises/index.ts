import type { Exercise } from './types';
import { les1Evaluatie } from './les1-evaluatie';
import { absRel } from './abs-rel';
import { functiesNesten } from './functies-nesten';

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
];

export const EXERCISES: Exercise[] = LESSONS.flatMap((l) => l.exercises);
