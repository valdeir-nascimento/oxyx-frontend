import { jsonNumberOf } from './typed-number';

/**
 * Um número digitado, como os contratos o recebem: o inteiro vai como número, o vazio como ausente, e o
 * resto como foi digitado, para o backend recusar junto do campo (FR-017). Veio do adaptador do farm na
 * feature 003, para o production usar também.
 */
describe('jsonNumberOf', () => {
  it.each([
    ['98', 98],
    [' 7 ', 7],
    ['07', 7],
    ['-1', -1],
    ['1.000', 1000],
    ['1.000.000', 1000000],
  ])('sends "%s" as the number %s', (typed, expected) => {
    expect(jsonNumberOf(typed)).toBe(expected);
  });

  it.each(['', '   '])('sends "%s" as absent', (typed) => {
    expect(jsonNumberOf(typed)).toBeNull();
  });

  it.each(['12.5', '12,5', 'doze', '1e3'])('sends "%s" as typed, for the backend to refuse in the field', (typed) => {
    expect(jsonNumberOf(typed)).toBe(typed);
  });
});
