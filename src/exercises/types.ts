/** Celadres in A1-notatie, bv. 'B11'. */
export type A1 = string;

/** 0-based adres. A1 = { row: 0, col: 0 }. */
export interface Addr {
  row: number;
  col: number;
}

/** Genormaliseerd bereik: start is linksboven, end is rechtsonder. */
export interface Range {
  start: Addr;
  end: Addr;
}

export type FormatKind = 'general' | 'number' | 'percent' | 'currency' | 'date' | 'text';

export interface NumberFormatSpec {
  kind: FormatKind;
  /** Aantal decimalen (number, percent, currency). */
  decimals?: number;
  /** Duizendtalscheiding met punt. */
  grouping?: boolean;
  currency?: '€';
  dateCode?: 'dd/mm/jjjj';
}

/** Gereserveerd voor v2 (opmaak). */
export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  fill?: string;
  color?: string;
  border?: { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };
}

export interface CellData {
  /** Wat de student typte: '=SOM(D5:F5)', '3,5', 'september', "'014 12 34 56". */
  raw: string;
  format?: NumberFormatSpec;
  style?: CellStyle;
  /** Cel is voorgegeven door de oefening en kan niet gewijzigd worden. */
  locked?: boolean;
}

export type CellValue = number | string | boolean | null;

export interface DisplayValue {
  value: CellValue;
  error?: { type: string; text: string };
  /** HyperFormula detailed type, bv. NUMBER_DATE, NUMBER_PERCENT, STRING. */
  detailedType?: string;
}

export interface EditState {
  addr: Addr;
  text: string;
  caret: number;
  /** Enter-modus: pijltjes bevestigen en bewegen. Edit-modus (F2/dubbelklik): pijltjes bewegen de caret. */
  mode: 'enter' | 'edit';
  source: 'cell' | 'formulaBar';
  /** Tekstbereik van de verwijzing die via klikken werd ingevoegd en bij slepen vervangen wordt. */
  pointRef?: { start: number; end: number };
  /** Cel die met de pijltjes wordt aangewezen in point-modus. */
  pointCursor?: Addr;
  /** Ankercel van het aangewezen bereik (Shift+pijltjes of Shift+klik breidt uit vanaf hier). */
  pointAnchor?: Addr;
  autocomplete?: { items: string[]; index: number; tokenStart: number };
  error?: string;
}

export interface SheetDef {
  rows: number;
  cols: number;
  cells: Record<A1, CellData>;
  colWidths?: Record<string, number>;
}

export interface Exercise {
  id: string;
  /** Verhogen als startdata of stappen wijzigen: bewaarde voortgang wordt dan gereset. */
  version: number;
  title: string;
  intro?: string;
  sheet: SheetDef;
  allowedFunctions?: string[];
  steps: Step[];
}

export interface Step {
  id: string;
  title: string;
  /** Opgavetekst in mini-markdown (**vet**, `code`, regels met '- ' zijn lijstitems). */
  text: string;
  hint?: string;
  checks: Check[];
}

export interface CheckContext {
  raw(a1: A1): string;
  value(a1: A1): CellValue;
  isError(a1: A1): boolean;
  errorText(a1: A1): string | null;
  /** Canonieke formule ('=SOM(D5:F5)') of null als de cel geen formule bevat. */
  formula(a1: A1): string | null;
  format(a1: A1): NumberFormatSpec | undefined;
  isText(a1: A1): boolean;
  /** Formule die ontstaat als `formula` in `anchor` wordt doorgetrokken naar `target`. */
  expectedFill(anchor: A1, formula: string, target: A1): string;
}

export type Check =
  | { type: 'formula'; cell: A1; expect: string | string[]; mode?: 'exact' | 'equivalent'; label?: string }
  | { type: 'value'; cell: A1; expect: number | string; tolerance?: number; label?: string }
  | { type: 'usesFunction'; cell: A1; fn: string; nestedIn?: string; label?: string }
  | { type: 'usesAbsoluteRef'; cell: A1; ref: string; label?: string }
  | { type: 'format'; range: string; expect: string | string[]; label?: string }
  | { type: 'isText'; cell: A1; expect?: string; label?: string }
  | { type: 'rangeFilled'; range: string; values: Array<string | number>; label?: string }
  | { type: 'fillPattern'; range: string; anchor: A1; formula: string; checkValues?: boolean; label?: string }
  | { type: 'predicate'; label: string; test: (ctx: CheckContext) => boolean; message?: string };

export interface CheckResult {
  ok: boolean;
  /** Waarde klopt maar de gevraagde techniek ontbreekt: oranje. */
  partial?: boolean;
  message: string;
}

export interface StepResult {
  ok: boolean;
  partial: boolean;
  /** Er is al iets ingevuld in de betrokken cellen (anders blijft de stap grijs). */
  touched: boolean;
  results: CheckResult[];
}
