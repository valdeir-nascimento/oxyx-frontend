import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Notification } from '../../../shared/domain/notification';
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
  imports: [Alert, Button, ErrorSummary, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="change-password">
      <h1 class="change-password__title">Trocar senha</h1>

      @if (mustChangePassword()) {
        <ovyx-alert variant="warning">
          <p>Troque a senha provisória para continuar usando o sistema.</p>
        </ovyx-alert>
      }

      @if (notification().hasErrors) {
        <ovyx-error-summary [errors]="notification().errors" [fields]="fields" />
      }

      <form class="change-password__form" (submit)="submit($event)">
        <ovyx-form-field
          controlId="currentPassword"
          label="Senha atual"
          type="password"
          autocomplete="current-password"
          [control]="form.controls.currentPassword"
          [error]="messageFor('currentPassword')"
        />

        <ovyx-form-field
          controlId="newPassword"
          label="Nova senha"
          type="password"
          autocomplete="new-password"
          [control]="form.controls.newPassword"
          [error]="messageFor('newPassword')"
        />

        <ovyx-button type="submit" [busy]="submitting()">Trocar senha</ovyx-button>
      </form>
    </section>
  `,
  styles: `
    .change-password {
      display: grid;
      gap: var(--ovyx-space-4);
      /* A largura desconta a calha dos dois lados: sem isto, o cartão encosta na
       * borda do telefone. O topo encolhe no telefone, senão o formulário nasce
       * abaixo da primeira dobra. */
      width: calc(100% - 2 * var(--ovyx-layout-gutter));
      max-width: var(--ovyx-layout-form-max);
      margin: var(--ovyx-layout-page-top) auto;
      padding: var(--ovyx-space-5);
      background-color: var(--ovyx-color-surface-raised);
      border: var(--ovyx-border-width-thin) solid var(--ovyx-color-border);
      border-radius: var(--ovyx-radius-md);
      box-shadow: var(--ovyx-shadow-sm);
    }

    .change-password__title {
      font-size: var(--ovyx-font-size-xl);
      font-weight: var(--ovyx-font-weight-bold);
      line-height: var(--ovyx-line-height-tight);
    }

    .change-password__form {
      display: grid;
      gap: var(--ovyx-space-4);
    }
  `,
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
