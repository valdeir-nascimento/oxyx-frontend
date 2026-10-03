import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Location } from '@angular/common';
import { FormBuilder } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { AuthLayout } from '../../../../shared/presentation/layout/auth-layout/auth-layout';
import { Alert } from '../../../../shared/presentation/ui/alert/alert';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { FormField } from '../../../../shared/presentation/ui/form-field/form-field';
import { isInvalidLink } from '../../../application/recovery/recovery-link';
import { ResetPasswordUseCase } from '../../../application/recovery/reset-password.usecase';
import { VerifyRecoveryLinkUseCase } from '../../../application/recovery/verify-recovery-link.usecase';

/**
 * O que a tela mostra: a conferência em curso, o formulário da nova senha, o aviso do link que não vale, ou a
 * confirmação para quem continua conectado com outra conta.
 */
type LinkState = 'checking' | 'valid' | 'invalid' | 'done';

/**
 * A redefinição da senha pelo link do e-mail (US2 da 012).
 *
 * O código vem no fragmento do endereço (`/redefinir-senha#código`), que o navegador não envia a nenhum servidor. A
 * tela o lê uma vez, o tira do endereço, para ele não ficar no histórico, e confere o link antes de pedir a senha.
 *
 * Concluída a redefinição, a pessoa volta à tela de entrada com o aviso, e entra com a senha nova: a redefinição não
 * abre sessão. Quem continua conectado com outra conta neste navegador vê a confirmação aqui mesmo.
 *
 * Um link novo aberto na mesma aba muda só o fragmento, sem recriar a tela: ela relê o código e confere de novo (QA da
 * 012, O-3).
 */
@Component({
  selector: 'ovyx-reset-password-page',
  imports: [AuthLayout, Alert, Button, ErrorSummary, FormField, RouterLink],
  templateUrl: './reset-password-page.html',
  styleUrl: './reset-password-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  private readonly verifyLink = inject(VerifyRecoveryLinkUseCase);
  private readonly resetPassword = inject(ResetPasswordUseCase);
  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private token = '';

  protected readonly form = inject(FormBuilder).nonNullable.group({ newPassword: '' });

  /** O campo desta tela: só ele vira link no resumo da recusa. */
  protected readonly fields = ['newPassword'];

  protected readonly state = signal<LinkState>('checking');
  protected readonly notification = signal(Notification.empty());
  protected readonly submitting = signal(false);

  private readonly invalidTitle = viewChild<ElementRef<HTMLElement>>('invalidTitle');
  private readonly doneTitle = viewChild<ElementRef<HTMLElement>>('doneTitle');

  constructor() {
    effect(() => this.invalidTitle()?.nativeElement.focus());
    effect(() => this.doneTitle()?.nativeElement.focus());
    this.read(this.route.snapshot.fragment);
    this.route.fragment.pipe(takeUntilDestroyed()).subscribe((fragment) => {
      if (fragment) {
        this.read(fragment);
      }
    });
  }

  /** Lê o código e o tira do endereço, para ele não ficar no histórico nem num endereço copiado; depois confere. */
  private read(fragment: string | null): void {
    if (fragment && fragment === this.token) {
      return;
    }
    this.token = fragment ?? '';
    this.location.replaceState('/redefinir-senha');
    this.form.reset();
    this.notification.set(Notification.empty());
    this.state.set('checking');
    void this.check();
  }

  protected messageFor(field: string): string | undefined {
    return this.notification().messageFor(field);
  }

  private async check(): Promise<void> {
    if (!this.token) {
      this.state.set('invalid');
      return;
    }
    const checked = this.token;
    const result = await this.verifyLink.execute(checked);
    if (checked !== this.token) {
      // Um link mais novo chegou na mesma aba enquanto este era conferido: a resposta é de um código que já saiu.
      return;
    }
    if (!result.success && isInvalidLink(result.notification)) {
      this.state.set('invalid');
      return;
    }
    // Outra falha (a rede, o servidor) não diz que o link morreu: o formulário aparece com o aviso, e o envio confere
    // o link de novo.
    this.notification.set(result.success ? Notification.empty() : result.notification);
    this.state.set('valid');
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitting.set(true);
    const result = await this.resetPassword.execute(
      this.token,
      this.form.getRawValue().newPassword,
    );
    this.submitting.set(false);

    if (!result.success) {
      if (isInvalidLink(result.notification)) {
        this.state.set('invalid');
        return;
      }
      this.notification.set(result.notification);
      return;
    }
    if (result.value === 'still-signed-in') {
      this.state.set('done');
      return;
    }
    await this.router.navigate(['/acesso'], { queryParams: { senha: 'redefinida' } });
  }
}
