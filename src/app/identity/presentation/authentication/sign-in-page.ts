import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Notification } from '../../../shared/domain/notification';
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
  imports: [Alert, Button, ErrorSummary, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="sign-in">
      <h1 class="sign-in__title">Entrar</h1>

      @if (sessionExpired) {
        <ovyx-alert variant="warning">
          <p>Sua sessão expirou. Entre novamente para continuar.</p>
        </ovyx-alert>
      }

      @if (notification().hasErrors) {
        <ovyx-error-summary [errors]="notification().errors" [fields]="fields" />
      }

      <form class="sign-in__form" (submit)="submit($event)">
        <ovyx-form-field
          controlId="identifier"
          label="E-mail ou celular"
          autocomplete="username"
          [control]="form.controls.identifier"
          [error]="messageFor('identifier')"
        />

        <ovyx-form-field
          controlId="password"
          label="Senha"
          type="password"
          autocomplete="current-password"
          [control]="form.controls.password"
          [error]="messageFor('password')"
        />

        <ovyx-button type="submit" [busy]="submitting()">Entrar</ovyx-button>
      </form>
    </section>
  `,
  styles: `
    .sign-in {
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

    .sign-in__title {
      font-size: var(--ovyx-font-size-xl);
      font-weight: var(--ovyx-font-weight-bold);
      line-height: var(--ovyx-line-height-tight);
    }

    .sign-in__form {
      display: grid;
      gap: var(--ovyx-space-4);
    }
  `,
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
