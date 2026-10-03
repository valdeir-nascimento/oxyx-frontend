import { Injectable, inject } from '@angular/core';
import { THEME_DISPLAY } from '../../../shared/application/theme-display';
import { AuthenticatedCaretaker } from '../../domain/authenticated-caretaker';

/**
 * O tema da conta aplicado na tela (R-004 da 011): na entrada, na restauração da sessão e depois da troca da senha
 * provisória, antes de a primeira tela aparecer, para ela não piscar no tema errado. Aplicado, ele passa também a ser
 * o lembrado no navegador.
 *
 * Com a senha provisória pendente, a pessoa ainda não entrou de fato: vale o tema do navegador, como na tela de
 * entrada (US3 da 011).
 */
@Injectable({ providedIn: 'root' })
export class AccountTheme {
  private readonly display = inject(THEME_DISPLAY);

  follow(caretaker: AuthenticatedCaretaker): void {
    if (!caretaker.mustChangePassword) {
      this.display.apply(caretaker.theme);
    }
  }
}
