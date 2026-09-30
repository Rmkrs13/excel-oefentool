/** A1 -> $A$1 -> A$1 -> $A1 -> A1 (de F4-cyclus van Excel). */
export function cycleAbsoluteSingle(ref: string): string {
  const m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(ref);
  if (!m) return ref;
  const [, colAbs, col, rowAbs, row] = m;
  const state = (colAbs ? 2 : 0) + (rowAbs ? 1 : 0); // 0: rel, 1: A$1, 2: $A1, 3: $A$1
  const order = [0, 3, 1, 2];
  const next = order[(order.indexOf(state) + 1) % order.length];
  return `${next & 2 ? '$' : ''}${col}${next & 1 ? '$' : ''}${row}`;
}

/** Ook voor bereiken: beide zijden tegelijk. */
export function cycleAbsolute(ref: string): string {
  return ref.split(':').map(cycleAbsoluteSingle).join(':');
}
