import { targetInputOf, targetOf } from './labels';

/** A meta de produtividade do setor, na lista e no formulário (feature 008). */
describe('farm labels', () => {
  describe('targetOf', () => {
    it.each([
      [72, '72%'],
      [82.5, '82,5%'],
      [100, '100%'],
      [1, '1%'],
    ])('writes %s as %s, with the decimal only when there is one', (value, expected) => {
      expect(targetOf(value)).toBe(expected);
    });
  });

  describe('targetInputOf', () => {
    it.each([
      [72, '72'],
      [82.5, '82,5'],
      [100, '100'],
    ])('fills the field with %s as %s, with a comma', (value, expected) => {
      expect(targetInputOf(value)).toBe(expected);
    });
  });
});
