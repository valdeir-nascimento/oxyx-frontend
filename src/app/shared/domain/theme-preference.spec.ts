import { isThemePreference, themeAttributeOf } from './theme-preference';

/**
 * O tema antes do Angular (R-004 da 011): o script em linha do `index.html` aplica a última escolha lembrada no
 * navegador, para a tela de entrada e o recarregamento não piscarem no tema errado. O script repete esta regra; o QA
 * confere na tela que os dois concordam (R-011).
 */
describe('themeAttributeOf', () => {
  it.each([
    ['DARK', 'dark'],
    ['LIGHT', 'light'],
  ])('gives the stored %s the attribute "%s"', (stored, attribute) => {
    expect(themeAttributeOf(stored)).toBe(attribute);
  });

  it.each(['SYSTEM', null, 'AZUL', ''])('leaves the theme to the device for %s', (stored) => {
    expect(themeAttributeOf(stored)).toBeNull();
  });

  it.each(['LIGHT', 'DARK', 'SYSTEM'])('takes %s as a theme', (value) => {
    expect(isThemePreference(value)).toBe(true);
  });

  it.each([null, '', 'dark', 'AZUL', 'toString', '__proto__'])('does not take %s as a theme', (value) => {
    expect(isThemePreference(value)).toBe(false);
  });
});
