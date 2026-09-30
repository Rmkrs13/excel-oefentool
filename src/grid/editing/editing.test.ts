import { describe, expect, it } from 'vitest';
import { functionTokenAtCaret, isRefInsertPosition, refTokenAtCaret } from './tokens';
import { cycleAbsolute } from './f4';
import { matchFunctions } from './autocomplete';

describe('functionTokenAtCaret', () => {
  it('herkent een prefix na =, ( ; en operatoren', () => {
    expect(functionTokenAtCaret('=SO', 3)).toEqual({ start: 1, prefix: 'SO' });
    expect(functionTokenAtCaret('=AFRONDEN(GEM', 13)).toEqual({ start: 10, prefix: 'GEM' });
    expect(functionTokenAtCaret('=SOM(A1;ma', 10)).toEqual({ start: 8, prefix: 'ma' });
    expect(functionTokenAtCaret('=A1*so', 6)).toEqual({ start: 4, prefix: 'so' });
  });
  it('geeft null buiten formules, in strings en bij celverwijzingen', () => {
    expect(functionTokenAtCaret('SOM', 3)).toBeNull();
    expect(functionTokenAtCaret('=', 1)).toBeNull();
    expect(functionTokenAtCaret('="ab', 4)).toBeNull();
    expect(functionTokenAtCaret('=B11', 4)).toBeNull();
    expect(functionTokenAtCaret('=SOM(D5:F5)', 11)).toBeNull();
    expect(functionTokenAtCaret('=SOM(D5:F5', 5)).toBeNull();
  });
});

describe('isRefInsertPosition', () => {
  it('klopt na = ( ; : en operatoren', () => {
    expect(isRefInsertPosition('=', 1)).toBe(true);
    expect(isRefInsertPosition('=SOM(', 5)).toBe(true);
    expect(isRefInsertPosition('=SOM(A1;', 8)).toBe(true);
    expect(isRefInsertPosition('=B21/', 5)).toBe(true);
    expect(isRefInsertPosition('=SOM(D5:F5)', 11)).toBe(false);
    expect(isRefInsertPosition('=B21', 4)).toBe(false);
    expect(isRefInsertPosition('hallo', 5)).toBe(false);
  });
});

describe('refTokenAtCaret', () => {
  it('vindt de verwijzing bij de caret', () => {
    expect(refTokenAtCaret('=B5/B3', 6)).toEqual({ start: 4, end: 6, ref: 'B3' });
    expect(refTokenAtCaret('=B5/B3', 2)).toEqual({ start: 1, end: 3, ref: 'B5' });
    expect(refTokenAtCaret('=SOM(D5:F5)', 8)).toEqual({ start: 5, end: 10, ref: 'D5:F5' });
    expect(refTokenAtCaret('=SOM(D5:F5)', 11)).toBeNull();
  });
});

describe('cycleAbsolute', () => {
  it('doorloopt de F4-cyclus', () => {
    expect(cycleAbsolute('B3')).toBe('$B$3');
    expect(cycleAbsolute('$B$3')).toBe('B$3');
    expect(cycleAbsolute('B$3')).toBe('$B3');
    expect(cycleAbsolute('$B3')).toBe('B3');
    expect(cycleAbsolute('D5:F5')).toBe('$D$5:$F$5');
  });
});

describe('matchFunctions', () => {
  const all = ['ABS', 'AANTAL', 'AANTALARG', 'AANTAL.ALS', 'AFRONDEN', 'AFRONDEN.NAAR.BOVEN', 'ALS', 'SOM', 'SOM.ALS', 'SOMPRODUCT', 'GEMIDDELDE', 'MIN', 'MAX', 'MEDIAAN'];
  it('zet aangeleerde functies eerst', () => {
    expect(matchFunctions('a', all)).toEqual(['AFRONDEN', 'AANTALARG', 'AANTAL', 'AANTAL.ALS', 'ABS', 'AFRONDEN.NAAR.BOVEN', 'ALS']);
    expect(matchFunctions('so', all)).toEqual(['SOM', 'SOM.ALS', 'SOMPRODUCT']);
    expect(matchFunctions('m', all)).toEqual(['MEDIAAN', 'MIN', 'MAX']);
  });
  it('respecteert een whitelist', () => {
    expect(matchFunctions('s', all, undefined, ['SOM'])).toEqual(['SOM']);
    expect(matchFunctions('', all)).toEqual([]);
  });
});
