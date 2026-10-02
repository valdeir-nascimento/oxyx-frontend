import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { THEME_DISPLAY } from '../../../shared/application/theme-display';
import { ThemePreference } from '../../../shared/domain/theme-preference';
import { ACCOUNT_GATEWAY } from './account-gateway';

/**
 * A escolha do tema pelo responsável (US1 e US2 da 011): vale na hora, na tela inteira, fica lembrada no aparelho e
 * é guardada na conta.
 *
 * Quando não dá para guardar (a sessão expirou, a conexão caiu), a tela não volta atrás: a escolha vale neste
 * aparelho, e quem chama avisa a pessoa (FR-008). A conta mantém a escolha anterior.
 */
@Injectable({ providedIn: 'root' })
export class ChooseThemeUseCase {
  private readonly display = inject(THEME_DISPLAY);
  private readonly account = inject(ACCOUNT_GATEWAY);

  async execute(preference: ThemePreference): Promise<Result<void>> {
    this.display.apply(preference);
    return this.account.changeTheme(preference);
  }
}
