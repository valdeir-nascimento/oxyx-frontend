import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Notification } from '../../../shared/domain/notification';
import { AuthLayout } from '../../../shared/presentation/layout/auth-layout/auth-layout';
import { Alert } from '../../../shared/presentation/ui/alert/alert';
import { Button } from '../../../shared/presentation/ui/button/button';
import { ErrorSummary } from '../../../shared/presentation/ui/error-summary/error-summary';
import { FormField } from '../../../shared/presentation/ui/form-field/form-field';
import { SignInUseCase } from '../../application/authentication/sign-in.usecase';

/**
 * Tela de acesso (FR-001).
 *
 * Coleta o que foi digitado, entrega ao caso de uso e mostra o que voltou. Não decide se o
 * identificador é e-mail ou celular, não avalia a senha e não interpreta a recusa: uma regra que
 * nascesse aqui valeria só para quem usa a tela, e não para quem chama a API.
 *
 * O desenho vem do design system: rótulo, erro e ligação de acessibilidade são trabalho do
 * `ovyx-form-field`, e esta tela não repete nenhum deles.
 */
@Component({
  selector: 'ovyx-sign-in-page',
  imports: [AuthLayout, Alert, Button, ErrorSummary, FormField],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  private readonly signIn = inject(SignInUseCase);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    identifier: '',
    password: '',
  });

  /**
   * Campos desta tela: só eles viram link no resumo da recusa. Sem validador: o que recusa
   * preenchimento é o caso de uso, e o que recusa a senha é o backend.
   */
  protected readonly fields = ['identifier', 'password'];

  protected readonly notification = signal(Notification.empty());
  protected readonly submitting = signal(false);

  /**
   * Motivo da volta à tela, lido do endereço.
   *
   * Vem na navegação que o interceptador faz no 401 (FR-003). Estando no endereço, o aviso
   * sobrevive a um recarregamento — em memória, ele morria no F5.
   */
  protected readonly sessionExpired =
    inject(ActivatedRoute).snapshot.queryParamMap.get('sessao') === 'expirada';

  protected messageFor(field: string): string | undefined {
    return this.notification().messageFor(field);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();

    const { identifier, password } = this.form.getRawValue();

    this.submitting.set(true);
    const result = await this.signIn.execute(identifier, password);
    this.submitting.set(false);

    if (!result.success) {
      this.notification.set(result.notification);
      return;
    }

    this.notification.set(Notification.empty());
    // Quem decide o destino de quem ainda deve a senha provisória é o guard da rota: repetir a
    // regra aqui criaria dois lugares para manter em sincronia (FR-025).
    await this.router.navigate(['/']);
  }
}
