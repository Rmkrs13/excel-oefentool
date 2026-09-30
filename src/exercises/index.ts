import type { Exercise } from './types';
import { les1Evaluatie } from './les1-evaluatie';
import { absRel } from './abs-rel';
import { functiesNesten } from './functies-nesten';
import { sportChallenge } from './sport-challenge';

export const EXERCISES: Exercise[] = [les1Evaluatie, absRel, functiesNesten, sportChallenge];
