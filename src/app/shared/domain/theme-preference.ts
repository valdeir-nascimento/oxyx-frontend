/**
 * O tema em que o responsável vê o Ovyx (feature 011): claro, escuro ou igual ao sistema, que acompanha o tema do
 * aparelho. É o mesmo vocabulário do backend.
 */
export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';

/** Verdadeiro para um dos três temas; o resto (ausente, outro texto) não é tema. */
export function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'LIGHT' || value === 'DARK' || value === 'SYSTEM';
}

/** A chave em que o navegador lembra a última escolha, para as telas antes do acesso. */
export const THEME_STORAGE_KEY = 'ovyx-theme';

/**
 * O atributo `data-theme` do `<html>` para a escolha lembrada: `dark` ou `light`, que o `tokens.css` força, ou
 * nenhum, e então vale o `prefers-color-scheme` do aparelho. Um valor estranho vale como "igual ao sistema".
 *
 * O script em linha do `index.html` repete esta regra, para aplicá-la antes do Angular (R-004 da 011).
 */
export function themeAttributeOf(stored: string | null): 'dark' | 'light' | null {
  switch (stored) {
    case 'DARK':
      return 'dark';
    case 'LIGHT':
      return 'light';
    default:
      return null;
  }
}
