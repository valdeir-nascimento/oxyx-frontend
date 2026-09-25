import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthLayout } from '../../../../shared/presentation/layout/auth-layout/auth-layout';
import { Alert } from '../../../../shared/presentation/ui/alert/alert';
import { SessionStore } from '../../../application/authentication/session-store';
import { ChangePasswordForm } from '../change-password-form/change-password-form';

/**
 * Tela cheia da troca da própria senha (FR-022, FR-025), fora da casca.
 *
 * Enquanto a senha provisória valer, é a única tela liberada — e por isso ela diz, em português,
 * por que apareceu. A política de senha não é repetida aqui: as mensagens que a pessoa lê são as
 * que o backend devolveu, uma por campo.
 *
 * O formulário é o `ovyx-change-password-form`, o mesmo da página da conta que o menu abre (US4).
 * Esta tela só dá a moldura das telas de acesso e decide o destino: o início, agora liberado.
 */
@Component({
  selector: 'ovyx-change-password-page',
  imports: [AuthLayout, Alert, ChangePasswordForm],
  templateUrl: './change-password-page.html',
  styleUrl: './change-password-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordPage {
  private readonly router = inject(Router);

  protected readonly mustChangePassword = inject(SessionStore).mustChangePassword;

  protected async goHome(): Promise<void> {
    await this.router.navigate(['/']);
  }
}
