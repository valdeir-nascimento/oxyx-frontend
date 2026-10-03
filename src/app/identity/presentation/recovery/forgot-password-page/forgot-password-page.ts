import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { AuthLayout } from '../../../../shared/presentation/layout/auth-layout/auth-layout';
import { Alert } from '../../../../shared/presentation/ui/alert/alert';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { FormField } from '../../../../shared/presentation/ui/form-field/form-field';
import { RequestRecoveryUseCase } from '../../../application/recovery/request-recovery.usecase';

/**
 * Esqueci a senha (US1 da 012): o pedido do link de recuperação pelo e-mail da conta.
 *
 * Depois do envio, a mensagem é a mesma para qualquer e-mail, exista ou não a conta: a tela não sabe e não pode
 * dizer (FR-002). O foco vai para o título da mensagem, porque o formulário que tinha o foco sai da tela.
 */
@Component({
  selector: 'ovyx-forgot-password-page',
  imports: [AuthLayout, Alert, Button, ErrorSummary, FormField, RouterLink],
  templateUrl: './forgot-password-page.html',
  styleUrl: './forgot-password-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly requestRecovery = inject(RequestRecoveryUseCase);

  protected readonly form = inject(FormBuilder).nonNullable.group({ email: '' });

  /** O campo desta tela: só ele vira link no resumo da recusa. */
  protected readonly fields = ['email'];

  protected readonly notification = signal(Notification.empty());
  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);

  private readonly sentTitle = viewChild<ElementRef<HTMLElement>>('sentTitle');

  constructor() {
    effect(() => this.sentTitle()?.nativeElement.focus());
  }

  protected messageFor(field: string): string | undefined {
    return this.notification().messageFor(field);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitting.set(true);
    const result = await this.requestRecovery.execute(this.form.getRawValue().email);
    this.submitting.set(false);

    if (!result.success) {
      this.notification.set(result.notification);
      return;
    }
    this.notification.set(Notification.empty());
    this.sent.set(true);
  }
}
