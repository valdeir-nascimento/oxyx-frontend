import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Notification } from '../../../shared/domain/notification';
import { AuthLayout } from '../../../shared/presentation/layout/auth-layout/auth-layout';
import { Alert } from '../../../shared/presentation/ui/alert/alert';
import { Button } from '../../../shared/presentation/ui/button/button';
import { ErrorSummary } from '../../../shared/presentation/ui/error-summary/error-summary';
import { FormField } from '../../../shared/presentation/ui/form-field/form-field';
import { ChangeOwnPasswordUseCase } from '../../application/account/change-password.usecase';
import { SessionStore } from '../../application/authentication/session-store';

/**
 * Tela de troca da própria senha (FR-022, FR-025).
 *
 * Enquanto a senha provisória valer, é a única tela liberada — e por isso ela diz, em português,
 * por que apareceu. A política de senha não é repetida aqui: as mensagens que a pessoa lê são as
 * que o backend devolveu, uma por campo.
 *
 * O formulário é o mesmo da tela de acesso, e agora isso se vê no código: as duas montam
 * `ovyx-form-field` e `ovyx-button`, e nenhuma das duas repete rótulo, erro ou medida.
 */
@Component({
  selector: 'ovyx-change-password-page',
  imports: [AuthLayout, Alert, Button, ErrorSummary, FormField],
  templateUrl: './change-password-page.html',
  styleUrl: './change-password-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordPage {
  private readonly changeOwnPassword = inject(ChangeOwnPasswordUseCase);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    currentPassword: '',
    newPassword: '',
  });

  /** Campos desta tela: só eles viram link no resumo da recusa. */
  protected readonly fields = ['currentPassword', 'newPassword'];

  protected readonly notification = signal(Notification.empty());
  protected readonly submitting = signal(false);
  protected readonly mustChangePassword = inject(SessionStore).mustChangePassword;

  protected messageFor(field: string): string | undefined {
    return this.notification().messageFor(field);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();

    const { currentPassword, newPassword } = this.form.getRawValue();

    this.submitting.set(true);
    const result = await this.changeOwnPassword.execute(currentPassword, newPassword);
    this.submitting.set(false);

    if (!result.success) {
      this.notification.set(result.notification);
      return;
    }

    this.notification.set(Notification.empty());
    await this.router.navigate(['/']);
  }
}
