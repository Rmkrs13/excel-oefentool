import type { DisplayValue, NumberFormatSpec } from '../exercises/types';
import { formatDateSerial } from './dates';

export interface FormatPreset {
  code: string;
  label: string;
  spec: NumberFormatSpec;
}

export const FORMAT_PRESETS: FormatPreset[] = [
  { code: 'Standaard', label: 'Standaard', spec: { kind: 'general' } },
  { code: '0', label: 'Getal, 0 decimalen', spec: { kind: 'number', decimals: 0 } },
  { code: '0,0', label: 'Getal, 1 decimaal', spec: { kind: 'number', decimals: 1 } },
  { code: '0,00', label: 'Getal, 2 decimalen', spec: { kind: 'number', decimals: 2 } },
  { code: '#.##0', label: 'Getal met duizendtal', spec: { kind: 'number', decimals: 0, grouping: true } },
  { code: '#.##0,0', label: 'Duizendtal, 1 decimaal', spec: { kind: 'number', decimals: 1, grouping: true } },
  { code: '#.##0,00', label: 'Duizendtal, 2 decimalen', spec: { kind: 'number', decimals: 2, grouping: true } },
  { code: '0%', label: 'Percentage', spec: { kind: 'percent', decimals: 0 } },
  { code: '0,0%', label: 'Percentage, 1 decimaal', spec: { kind: 'percent', decimals: 1 } },
  { code: '0,00%', label: 'Percentage, 2 decimalen', spec: { kind: 'percent', decimals: 2 } },
  { code: '€ #.##0', label: 'Valuta, 0 decimalen', spec: { kind: 'currency', decimals: 0, grouping: true, currency: '€' } },
  { code: '€ #.##0,00', label: 'Valuta, 2 decimalen', spec: { kind: 'currency', decimals: 2, grouping: true, currency: '€' } },
  { code: 'dd/mm/jjjj', label: 'Datum', spec: { kind: 'date', dateCode: 'dd/mm/jjjj' } },
  { code: '@', label: 'Tekst', spec: { kind: 'text' } },
];

/** Notatiecode (Excel-NL stijl) -> spec. Gooit bij onbekende code. */
export function parseFormatCode(code: string): NumberFormatSpec {
  const preset = FORMAT_PRESETS.find((p) => p.code === code);
  if (preset) return { ...preset.spec };
  // generieke vorm: [€ ][#.##]0[,0…][%]
  const m = /^(€ )?(#\.##)?0(,(0+))?(%)?$/.exec(code);
  if (!m) throw new Error(`Onbekende notatiecode: ${code}`);
  const decimals = m[4] ? m[4].length : 0;
  const grouping = !!m[2];
  if (m[1]) return { kind: 'currency', decimals, grouping: true, currency: '€' };
  if (m[5]) return { kind: 'percent', decimals };
  return grouping ? { kind: 'number', decimals, grouping: true } : { kind: 'number', decimals };
}

/** Spec -> notatiecode, zoals in de toolbar en in checks gebruikt. */
export function formatCode(spec: NumberFormatSpec | undefined): string {
  if (!spec) return 'Standaard';
  const dec = spec.decimals ?? 0;
  const decPart = dec > 0 ? ',' + '0'.repeat(dec) : '';
  switch (spec.kind) {
    case 'general':
      return 'Standaard';
    case 'text':
      return '@';
    case 'date':
      return 'dd/mm/jjjj';
    case 'percent':
      return `0${decPart}%`;
    case 'currency':
      return `€ #.##0${decPart}`;
    case 'number':
      return `${spec.grouping ? '#.##0' : '0'}${decPart}`;
  }
}

export function sameFormat(a: NumberFormatSpec | undefined, b: NumberFormatSpec | undefined): boolean {
  return formatCode(a) === formatCode(b);
}

const nf = new Map<string, Intl.NumberFormat>();
function numberFormatter(decimals: number, grouping: boolean): Intl.NumberFormat {
  const key = `${decimals}|${grouping}`;
  let f = nf.get(key);
  if (!f) {
    f = new Intl.NumberFormat('nl-BE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: grouping,
    });
    nf.set(key, f);
  }
  return f;
}

/** Excel-'Standaard': tot 10 significante cijfers, komma als decimaalteken, geen groepering. */
export function formatGeneral(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const rounded = Number(n.toPrecision(10));
  let s = String(rounded);
  if (/e/i.test(s)) s = rounded.toExponential(2).replace('e+', 'E+').replace('e-', 'E-');
  return s.replace('.', ',');
}

export interface FormattedCell {
  text: string;
  align: 'left' | 'right' | 'center';
}

/** Zet een berekende waarde om naar weergavetekst plus uitlijning. */
export function formatValue(dv: DisplayValue | undefined, raw: string, spec?: NumberFormatSpec): FormattedCell {
  if (!dv) return { text: '', align: 'left' };
  if (dv.error) return { text: dv.error.text, align: 'center' };
  const v = dv.value;
  if (v === null || v === undefined) return { text: '', align: 'left' };
  if (typeof v === 'boolean') return { text: v ? 'WAAR' : 'ONWAAR', align: 'center' };
  if (typeof v === 'string') return { text: v, align: 'left' };

  const kind = spec?.kind ?? 'general';
  switch (kind) {
    case 'text':
      // Getal met notatie Tekst: toon het zoals getypt (voor formules: de waarde).
      return { text: raw.startsWith('=') ? formatGeneral(v) : raw, align: 'left' };
    case 'number':
      return { text: numberFormatter(spec?.decimals ?? 0, !!spec?.grouping).format(v), align: 'right' };
    case 'percent':
      return { text: numberFormatter(spec?.decimals ?? 0, false).format(v * 100) + '%', align: 'right' };
    case 'currency':
      return { text: '€ ' + numberFormatter(spec?.decimals ?? 2, spec?.grouping ?? true).format(v), align: 'right' };
    case 'date':
      return { text: formatDateSerial(v), align: 'right' };
    case 'general':
    default: {
      // Als HyperFormula weet dat het een datum/percentage is (getypt als zodanig), toon dat ook zo.
      if (dv.detailedType === 'NUMBER_DATE') return { text: formatDateSerial(v), align: 'right' };
      if (dv.detailedType === 'NUMBER_PERCENT') return { text: formatGeneral(v * 100) + '%', align: 'right' };
      return { text: formatGeneral(v), align: 'right' };
    }
  }
}

/** Decimalen +1 / -1 zoals de Excel-knoppen. Standaard wordt Getal met 2 decimalen als vertrekpunt. */
export function adjustDecimals(spec: NumberFormatSpec | undefined, delta: 1 | -1, currentValue?: number): NumberFormatSpec {
  if (!spec || spec.kind === 'general' || spec.kind === 'text' || spec.kind === 'date') {
    let base = 0;
    if (currentValue !== undefined && Number.isFinite(currentValue)) {
      const s = formatGeneral(currentValue);
      base = (s.split(',')[1] ?? '').length;
    }
    return { kind: 'number', decimals: Math.max(0, base + delta) };
  }
  return { ...spec, decimals: Math.max(0, (spec.decimals ?? 0) + delta) };
}
