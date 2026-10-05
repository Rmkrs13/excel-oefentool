import type { A1, CellData, Exercise } from './types';

const getallen = [4820, 3460, 2430, 6750, 4365, 5178, 7156, 3960];
const COLS = 'BCDEFGHI';

function sheet(): Record<A1, CellData> {
  const cells: Record<A1, CellData> = {
    A1: { raw: 'Getallen:', style: { bold: true } },
    A2: { raw: 'Rangorde:', style: { bold: true } },
    A3: { raw: 'Getallen in volgorde:', style: { bold: true } },
  };
  getallen.forEach((g, i) => {
    cells[`${COLS[i]}1`] = { raw: String(g) };
    cells[`${COLS[i]}2`] = { raw: String(i + 1) };
  });
  return cells;
}

const dalend = [...getallen].sort((a, b) => b - a);
const stijgend = [...getallen].sort((a, b) => a - b);
const widths = { A: 22, B: 8, C: 8, D: 8, E: 8, F: 8, G: 8, H: 8, I: 8 };

export const les3GrootsteKleinste: Exercise = {
  id: 'les3-grootste-kleinste',
  version: 1,
  title: 'Rangschikken met GROOTSTE en KLEINSTE',
  intro: 'Zet een reeks getallen in volgorde met een formule: GROOTSTE geeft het k-de grootste getal, KLEINSTE het k-de kleinste. Het rangnummer k staat in rij 2.',
  sheets: [
    { name: 'GROOTSTE', rows: 6, cols: 10, cells: sheet(), colWidths: widths },
    { name: 'KLEINSTE', rows: 6, cols: 10, cells: sheet(), colWidths: widths },
  ],
  steps: [
    {
      id: 'grootste',
      title: 'Van groot naar klein met GROOTSTE',
      text: 'Op tabblad **GROOTSTE**: zet in **B3** een formule die het grootste getal uit B1:I1 geeft, met als rangnummer de waarde in B2 (1 = het grootste). Zet het bereik met de getallen vast met `$` en trek de formule door naar rechts tot **I3**.',
      hint: '`=GROOTSTE($B$1:$I$1;B2)`. Zonder $ schuift het bereik mee naar rechts en vallen er getallen buiten.',
      checks: [
        { type: 'usesFunction', cell: 'GROOTSTE!B3', fn: 'GROOTSTE' },
        { type: 'usesAbsoluteRef', cell: 'GROOTSTE!B3', ref: '$B$1:$I$1' },
        { type: 'rangeFilled', range: 'GROOTSTE!B3:I3', values: dalend },
      ],
    },
    {
      id: 'kleinste',
      title: 'Van klein naar groot met KLEINSTE',
      text: 'Op tabblad **KLEINSTE**: doe hetzelfde, maar nu van klein naar groot met **KLEINSTE**.',
      checks: [
        { type: 'usesFunction', cell: 'KLEINSTE!B3', fn: 'KLEINSTE' },
        { type: 'usesAbsoluteRef', cell: 'KLEINSTE!B3', ref: '$B$1:$I$1' },
        { type: 'rangeFilled', range: 'KLEINSTE!B3:I3', values: stijgend },
      ],
    },
  ],
};
