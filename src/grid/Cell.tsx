import { memo } from 'react';
import { useSheetStore } from '../store/sheetStore';
import { formatValue } from '../format/numberFormat';
import { toA1 } from '../engine/address';

interface Props {
  a1: string;
  row: number;
  col: number;
}

export const Cell = memo(function Cell({ a1, row, col }: Props) {
  const cell = useSheetStore((s) => s.cells[a1]);
  const dv = useSheetStore((s) => s.values[a1]);
  const nextA1 = toA1({ row, col: col + 1 });
  const nextEmpty = useSheetStore((s) => (s.exercise ? col + 1 < s.exercise.sheet.cols && !(s.cells[nextA1]?.raw) : false));
  const { text, align } = formatValue(dv, cell?.raw ?? '', cell?.format);
  const cls = ['cell', `al-${align}`];
  if (align === 'left' && nextEmpty && text.length > 0) cls.push('spill');
  if (cell?.locked) cls.push('locked');
  if (dv?.error) cls.push('err');
  if (cell?.style?.bold) cls.push('bold');
  return (
    <div className={cls.join(' ')} data-r={row} data-c={col} title={dv?.error ? dv.error.text : undefined}>
      {text}
    </div>
  );
});
