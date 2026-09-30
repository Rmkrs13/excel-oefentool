import { HyperFormula, type ConfigParams } from 'hyperformula';
import nlNL from 'hyperformula/i18n/languages/nlNL';

export const LANG = 'nlBE';

const nlBE = {
  ...nlNL,
  langCode: LANG,
  errors: { ...nlNL.errors, DIV_BY_ZERO: '#DEEL/0!' },
};

let registered = false;
export function ensureLanguage(): void {
  if (registered) return;
  HyperFormula.registerLanguage(LANG, nlBE);
  registered = true;
}

export const HF_CONFIG: Partial<ConfigParams> = {
  licenseKey: 'gpl-v3',
  language: LANG,
  functionArgSeparator: ';',
  decimalSeparator: ',',
  thousandSeparator: '',
  arrayColumnSeparator: ';',
  arrayRowSeparator: '|',
  localeLang: 'nl',
  dateFormats: ['DD/MM/YYYY', 'DD/MM/YY'],
  nullDate: { year: 1899, month: 12, day: 30 },
  smartRounding: true,
};

export function buildEngine(): { hf: HyperFormula; sheetId: number } {
  ensureLanguage();
  const hf = HyperFormula.buildEmpty(HF_CONFIG);
  const name = hf.addSheet('Blad1');
  const sheetId = hf.getSheetId(name);
  if (sheetId === undefined) throw new Error('Kon werkblad niet aanmaken');
  return { hf, sheetId };
}

let functionNames: string[] | null = null;
/** Alle Nederlandse functienamen die HyperFormula kent (gecached). */
export function allFunctionNames(): string[] {
  if (!functionNames) {
    ensureLanguage();
    functionNames = [...HyperFormula.getRegisteredFunctionNames(LANG)].sort();
  }
  return functionNames;
}

/** Vertaalt een fouttype van HyperFormula naar een korte uitleg voor studenten. */
export function explainError(type: string): string {
  switch (type) {
    case 'DIV_BY_ZERO':
      return 'Deling door nul: de noemer is 0 of leeg.';
    case 'NAME':
      return 'Onbekende naam: controleer de functienaam of de verwijzing.';
    case 'VALUE':
      return 'Verkeerd type: je rekent met tekst in plaats van een getal.';
    case 'REF':
      return 'Ongeldige verwijzing.';
    case 'NUM':
      return 'Ongeldig getal.';
    case 'NA':
      return 'Waarde niet beschikbaar.';
    case 'CYCLE':
      return 'Kringverwijzing: de formule verwijst naar zichzelf.';
    case 'ERROR':
      return 'De formule kan niet gelezen worden. Controleer haakjes en puntkomma’s.';
    default:
      return 'Fout in de formule.';
  }
}
