import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY } from '../domain/theme-preference';
import { DocumentThemeDisplay } from './document-theme-display';

/**
 * O tema aplicado na tela (R-006 da 011): o atributo `data-theme` no `<html>`, que o `tokens.css` do design system
 * lê, e a última escolha lembrada no navegador para as telas antes do acesso.
 */
describe('DocumentThemeDisplay', () => {
  const html = document.documentElement;

  function display(): DocumentThemeDisplay {
    return TestBed.inject(DocumentThemeDisplay);
  }

  beforeEach(() => {
    localStorage.clear();
    html.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    html.removeAttribute('data-theme');
  });

  it.each([
    ['DARK', 'dark'],
    ['LIGHT', 'light'],
  ] as const)('forces the %s theme on the page', (preference, attribute) => {
    display().apply(preference);

    expect(html.getAttribute('data-theme')).toBe(attribute);
  });

  it('leaves the theme to the device when the choice is the system one', () => {
    html.setAttribute('data-theme', 'dark');

    display().apply('SYSTEM');

    expect(html.hasAttribute('data-theme')).toBe(false);
  });

  it.each(['LIGHT', 'DARK', 'SYSTEM'] as const)(
    'remembers %s in the browser and gives it back',
    (preference) => {
      display().apply(preference);

      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(preference);
      expect(display().current()).toBe(preference);
    },
  );

  it('starts on the system theme when nothing is stored', () => {
    expect(display().current()).toBe('SYSTEM');
  });

  it.each(['AZUL', 'toString', '__proto__'])('starts on the system theme when %s is stored', (stored) => {
    localStorage.setItem(THEME_STORAGE_KEY, stored);

    expect(display().current()).toBe('SYSTEM');
  });

  it('still applies the theme, and remembers the system one, when the storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });

    expect(() => display().apply('DARK')).not.toThrow();
    expect(html.getAttribute('data-theme')).toBe('dark');
    expect(display().current()).toBe('DARK');
  });

  it('applies the choice made in another tab of the same browser', () => {
    display();

    window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'DARK' }));

    expect(html.getAttribute('data-theme')).toBe('dark');
  });

  it('starts on the theme remembered in the browser', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'DARK');

    expect(display().current()).toBe('DARK');
  });

  it('starts on the system theme when the storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });

    expect(display().current()).toBe('SYSTEM');
  });

  it('keeps the theme in effect up to date with the choice made here and in another tab (QA D2)', () => {
    const themes = display();

    themes.apply('LIGHT');
    expect(themes.current()).toBe('LIGHT');

    window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'DARK' }));
    expect(themes.current()).toBe('DARK');

    window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'AZUL' }));
    expect(themes.current()).toBe('DARK');
  });

  it('ignores the changes of other keys in another tab', () => {
    display();

    window.dispatchEvent(new StorageEvent('storage', { key: 'outra-chave', newValue: 'DARK' }));

    expect(html.hasAttribute('data-theme')).toBe(false);
  });
});
