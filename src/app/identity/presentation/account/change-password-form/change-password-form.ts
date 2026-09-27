import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Notification } from '../../../../shared/domain/notification';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { FormField } from '../../../../shared/presentation/ui/form-field/form-field';
import { ChangeOwnPasswordUseCase } from '../../../application/account/change-password.usecase';

/**
 * Onde o formulário aparece: `screen` é a tela cheia das telas de acesso (o `.login-form` do design
 * system); `panel`, um cartão dentro da casca.
 */
export type ChangePasswordFormVariant = 'screen' | 'panel';

/**
 * Formulário da troca da própria senha (FR-020, US4), o mesmo nas duas telas que trocam a senha: a
 * tela cheia da senha provisória (FR-025) e a página da conta, aberta pelo menu.
 *
 * Recolhe as duas senhas, entrega ao caso de uso e mostra o que voltou. Não conhece a política de
 * senha: as mensagens que a pessoa lê são as do backend, uma por campo, e o resumo da recusa recebe
 * o foco (T234). Quando dá certo, avisa por `changed`; para onde ir depois é decisão de cada tela.
 *
 * O elemento do componente não ocupa caixa: o `<form>` é o filho da grade do `.login`, na tela
 * cheia, e do cartão, na casca. O cabeçalho da tela vem projetado no topo do formulário.
 *
 * Só o painel tem "Cancelar", porque na troca obrigatória não há para onde voltar (FR-025). Ele é do
 * formulário, e não da página, para ficar desabilitado enquanto a troca corre: saindo no meio do
 * envio, a senha mudava no servidor e a pessoa, sem o toast, achava que tinha cancelado.
 */
@Component({
  selector: 'ovyx-change-password-form',
  imports: [Button, ErrorSummary, FormField],
  templateUrl: './change-password-form.html',
  styleUrl: './change-password-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordForm {
  private readonly changeOwnPassword = inject(ChangeOwnPasswordUseCase);

  readonly variant = input<ChangePasswordFormVariant>('screen');

  /** A troca deu certo. */
  readonly changed = output<void>();

  /** A pessoa desistiu, no painel. */
  readonly cancelled = output<void>();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    currentPassword: '',
    newPassword: '',
  });

  /** Campos deste formulário: só eles viram link no resumo da recusa. */
  protected readonly fields = ['currentPassword', 'newPassword'];

  protected readonly notification = signal(Notification.empty());
  protected readonly submitting = signal(false);

  protected readonly formClass = computed(() => (this.variant() === 'screen' ? 'login-form' : 'panel'));

  protected messageFor(field: string): string | undefined {
    return this.notification().messageFor(field);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    // O botão ocupado já barra o segundo clique; o Enter num campo envia o formulário sem passar
    // por ele.
    if (this.submitting()) {
      return;
    }

    const { currentPassword, newPassword } = this.form.getRawValue();

    this.submitting.set(true);
    const result = await this.changeOwnPassword.execute(currentPassword, newPassword);
    this.submitting.set(false);

    if (!result.success) {
      this.notification.set(result.notification);
      return;
    }

    this.notification.set(Notification.empty());
    this.changed.emit();
  }
}
