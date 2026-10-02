import { InjectionToken, Signal } from '@angular/core';
import { ThemePreference } from '../domain/theme-preference';

/**
 * Aplica o tema na tela e lembra a última escolha no navegador (R-006 da 011).
 *
 * É porta porque aplicar o tema mexe no documento e no armazenamento do navegador: nenhum componente nem caso de uso
 * faz isso direto. O `shared/infrastructure` fornece a implementação.
 */
export interface ThemeDisplay {
  /** Aplica o tema na tela inteira, na hora, e o lembra no navegador. */
  apply(preference: ThemePreference): void;

  /**
   * O tema em vigor na tela, que o seletor do topo mostra: o último aplicado, nesta aba ou em outra do mesmo
   * navegador, ou, antes disso, o lembrado no navegador (`SYSTEM` quando não há nenhum).
   */
  readonly current: Signal<ThemePreference>;
}

export const THEME_DISPLAY = new InjectionToken<ThemeDisplay>('ThemeDisplay');
