import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { Alert } from '../../../../shared/presentation/ui/alert/alert';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { FormField } from '../../../../shared/presentation/ui/form-field/form-field';
import { PageHeader } from '../../../../shared/presentation/ui/page-header/page-header';
import { SelectField } from '../../../../shared/presentation/ui/select-field/select-field';
import {
  FindCaretakerUseCase,
  RegisterCaretakerUseCase,
  UpdateCaretakerUseCase,
} from '../../../application/caretaker/caretaker.usecase';
import { Role } from '../../../domain/authenticated-caretaker';
import { ROLE_OPTIONS } from '../../labels';
import { CaretakerNotice } from '../caretaker-notice';

const NOT_FOUND = 'CARETAKER_NOT_FOUND';
const REGISTRATION_FIELDS = ['fullName', 'cpf', 'email', 'mobilePhone', 'password', 'role'];
const UPDATE_FIELDS = ['fullName', 'cpf', 'email', 'mobilePhone', 'role'];

/**
 * Cadastro e edição de responsável (FR-013, FR-014; T091).
 *
 * O formulário não valida nada: entrega o que foi digitado, e o backend devolve todas as falhas de
 * uma vez (FR-017). Cada mensagem aparece junto do seu campo, e o resumo da recusa recebe o foco e
 * leva a cada campo (T234). A senha só existe no cadastro — é provisória, e o responsável a troca no
 * primeiro acesso —; a edição não troca senha.
 */
@Component({
  selector: 'ovyx-caretaker-form-page',
  imports: [Alert, Button, ErrorSummary, FormField, PageHeader, RouterLink, SelectField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="caretaker-form">
      <ovyx-page-header [title]="editing() ? 'Editar responsável' : 'Novo responsável'" />

      @if (notFound()) {
        <ovyx-alert variant="danger">
          <p>Responsável não encontrado.</p>
        </ovyx-alert>
        <a class="caretaker-form__back" routerLink="/responsaveis">Voltar à lista de responsáveis</a>
      } @else {
        @if (notification().hasErrors) {
          <ovyx-error-summary [errors]="notification().errors" [fields]="fields()" />
        }

        <form class="caretaker-form__form" (submit)="submit($event)">
          <ovyx-form-field
            controlId="fullName"
            label="Nome completo"
            autocomplete="off"
            [control]="form.controls.fullName"
            [error]="messageFor('fullName')"
          />
          <ovyx-form-field
            controlId="cpf"
            label="CPF"
            hint="Só os dígitos, ou com pontos e traço."
            autocomplete="off"
            [control]="form.controls.cpf"
            [error]="messageFor('cpf')"
          />
          <ovyx-form-field
            controlId="email"
            label="E-mail"
            type="email"
            autocomplete="off"
            [control]="form.controls.email"
            [error]="messageFor('email')"
          />
          <ovyx-form-field
            controlId="mobilePhone"
            label="Celular"
            type="tel"
            hint="Com DDD."
            autocomplete="off"
            [control]="form.controls.mobilePhone"
            [error]="messageFor('mobilePhone')"
          />
          @if (!editing()) {
            <ovyx-form-field
              controlId="password"
              label="Senha provisória"
              type="password"
              autocomplete="new-password"
              hint="O responsável troca esta senha no primeiro acesso. De 12 a 128 caracteres, com letra e dígito."
              [control]="form.controls.password"
              [error]="messageFor('password')"
            />
          }
          <ovyx-select-field
            controlId="role"
            label="Perfil"
            [control]="form.controls.role"
            [options]="roleOptions"
            [error]="messageFor('role')"
          />

          <div class="caretaker-form__actions">
            <ovyx-button type="submit" [busy]="submitting()">
              {{ editing() ? 'Salvar alterações' : 'Cadastrar' }}
            </ovyx-button>
            <a class="caretaker-form__back" routerLink="/responsaveis">Cancelar</a>
          </div>
        </form>
      }
    </section>
  `,
  styles: `
    .caretaker-form {
      display: grid;
      gap: var(--ovyx-space-4);
      max-width: var(--ovyx-layout-form-max);
    }

    .caretaker-form__form {
      display: grid;
      gap: var(--ovyx-space-4);
    }

    .caretaker-form__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ovyx-space-3);
    }

    .caretaker-form__back {
      display: inline-flex;
      align-items: center;
      min-height: var(--ovyx-control-height-md);
      padding: 0 var(--ovyx-space-2);
      color: var(--ovyx-color-brand-text);
    }
  `,
})
export class CaretakerFormPage {
  private readonly register = inject(RegisterCaretakerUseCase);
  private readonly update = inject(UpdateCaretakerUseCase);
  private readonly find = inject(FindCaretakerUseCase);
  private readonly notice = inject(CaretakerNotice);
  private readonly router = inject(Router);

  /** Identificador de quem se edita; ausente no cadastro. */
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly editing = signal(this.id !== null);
  protected readonly fields = computed(() => (this.editing() ? UPDATE_FIELDS : REGISTRATION_FIELDS));

  protected readonly form = inject(FormBuilder).nonNullable.group({
    fullName: '',
    cpf: '',
    email: '',
    mobilePhone: '',
    password: '',
    role: 'USER',
  });

  protected readonly notification = signal(Notification.empty());
  protected readonly submitting = signal(false);
  protected readonly notFound = signal(false);

  constructor() {
    if (this.id !== null) {
      void this.load(this.id);
    }
  }

  protected messageFor(field: string): string | undefined {
    return this.notification().messageFor(field);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const { password, role, ...data } = this.form.getRawValue();
    const chosenRole = (role || null) as Role | null;

    this.submitting.set(true);
    const result =
      this.id === null
        ? await this.register.execute({ ...data, password, role: chosenRole })
        : await this.update.execute(this.id, { ...data, role: chosenRole });
    this.submitting.set(false);

    if (!result.success) {
      this.notification.set(result.notification);
      return;
    }

    this.notification.set(Notification.empty());
    this.notice.post(
      this.id === null
        ? `Responsável cadastrado: ${result.value.fullName}.`
        : `Alterações salvas: ${result.value.fullName}.`,
    );
    await this.router.navigate(['/responsaveis']);
  }

  private async load(id: string): Promise<void> {
    const result = await this.find.execute(id);
    if (!result.success) {
      const missing = result.notification.errors.some((error) => error.code === NOT_FOUND);
      if (missing) {
        this.notFound.set(true);
      } else {
        this.notification.set(result.notification);
      }
      return;
    }

    const { fullName, cpf, email, mobilePhone, role } = result.value;
    this.form.patchValue({ fullName, cpf, email, mobilePhone, role });
  }
}
