import type { CellData, CellValue } from '../exercises/types';

export const MONTHS_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export const MONTHS_NL_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export const DAYS_NL = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
export const DAYS_NL_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

const LISTS = [MONTHS_NL, MONTHS_NL_SHORT, DAYS_NL, DAYS_NL_SHORT];

function applyCase(template: string, word: string): string {
  if (template === template.toUpperCase() && template.length > 1) return word.toUpperCase();
  if (template[0] === template[0].toUpperCase()) return word[0].toUpperCase() + word.slice(1);
  return word;
}

function findList(text: string): { list: string[]; index: number } | null {
  const lower = text.trim().toLowerCase();
  for (const list of LISTS) {
    const index = list.indexOf(lower);
    if (index >= 0) return { list, index };
  }
  return null;
}

type Source = { cell: CellData | undefined; value: CellValue };
type Out = { raw: string; format?: CellData['format'] };

/** Constante stap tussen opeenvolgende getallen, of null. */
function constantStep(nums: number[]): number | null {
  if (nums.length < 2) return null;
  const step = nums[1] - nums[0];
  return nums.every((v, i) => i === 0 || Math.abs(v - nums[i - 1] - step) < 1e-9) ? step : null;
}

/**
 * Berekent de reeks die de vulgreep produceert voor `count` nieuwe cellen.
 * Formules blijven ongewijzigd in de uitvoer; de aanroeper vervangt ze door de verschoven
 * formules van de engine. `direction`: +1 voor omlaag/rechts, -1 voor omhoog/links.
 */
export function computeSeries(source: Source[], count: number, direction: 1 | -1 = 1): Out[] {
  const n = source.length;
  if (n === 0 || count <= 0) return [];
  const src = direction === 1 ? source : [...source].reverse();
  const raws = src.map((s) => s.cell?.raw ?? '');
  const last = src[n - 1];
  const fmt = (i: number) => src[i].cell?.format;

  // 1. Getallen: 1 bron kopiëren, ≥2 met constante stap doortrekken.
  const isPlainNumber = (s: Source) => typeof s.value === 'number' && !(s.cell?.raw ?? '').startsWith('=');
  if (src.every(isPlainNumber) && n >= 2) {
    const step = constantStep(src.map((s) => s.value as number));
    if (step !== null) {
      const base = last.value as number;
      return Array.from({ length: count }, (_, i) => ({ raw: numberToRaw(base + step * (i + 1)), format: fmt(n - 1) }));
    }
  }

  // 2. Lijstreeks (maanden, dagen): alle bronnen in dezelfde lijst met constante stap.
  const hits = raws.map(findList);
  if (hits.every((h) => h !== null) && hits.every((h) => h!.list === hits[0]!.list)) {
    const list = hits[0]!.list;
    const idx = hits.map((h) => h!.index);
    const step = n === 1 ? direction : constantStep(idx.map((v, i) => (i === 0 ? v : Math.abs(v - idx[i - 1]) > list.length / 2 ? v + Math.sign(idx[i - 1] - v) * list.length : v)));
    if (step !== null) {
      const len = list.length;
      const base = idx[n - 1];
      return Array.from({ length: count }, (_, i) => {
        const k = (((base + step * (i + 1)) % len) + len) % len;
        return { raw: applyCase(raws[n - 1].trim(), list[k]), format: fmt(n - 1) };
      });
    }
  }

  // 3. Tekst met eindgetal: 'Winkel 1' -> 'Winkel 2'; 'Winkel 1','Winkel 3' -> 5, 7.
  const numbered = raws.map((r) => /^(.*?)(\d+)$/.exec(r));
  if (numbered.every((m) => m !== null) && numbered.every((m) => m![1] === numbered[0]![1]) && !src.every(isPlainNumber)) {
    const prefix = numbered[0]![1];
    const nums = numbered.map((m) => parseInt(m![2], 10));
    const step = n === 1 ? direction : constantStep(nums);
    if (step !== null) {
      const width = numbered[n - 1]![2].length;
      return Array.from({ length: count }, (_, i) => ({
        raw: `${prefix}${String(Math.max(0, nums[n - 1] + step * (i + 1))).padStart(width, '0')}`,
        format: fmt(n - 1),
      }));
    }
  }

  // 4. Anders: cyclisch kopiëren (ook formules; die worden door de aanroeper verschoven).
  return Array.from({ length: count }, (_, i) => ({ raw: raws[i % n], format: fmt(i % n) }));
}

function numberToRaw(v: number): string {
  return String(Number(v.toPrecision(12))).replace('.', ',');
}
