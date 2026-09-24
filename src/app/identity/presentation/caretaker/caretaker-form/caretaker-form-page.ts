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
import { FindCaretakerByIdUseCase } from '../../../application/caretaker/find-caretaker-by-id.usecase';
import { RegisterCaretakerUseCase } from '../../../application/caretaker/register-caretaker.usecase';
import { UpdateCaretakerUseCase } from '../../../application/caretaker/update-caretaker.usecase';
import { Role } from '../../../domain/authenticated-caretaker';
import { ROLE_OPTIONS } from '../../labels/labels';
import { CaretakerNotice } from '../caretaker-notice';

const NOT_FOUND = 'CARETAKER_NOT_FOUND';
/** O 400 de um identificador que não é UUID: para quem abriu o endereço, é um responsável que não existe. */
const INVALID_ID = 'VALIDATION_FAILED';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REGISTRATION_FIELDS = ['fullName', 'cpf', 'email', 'mobilePhone', 'password', 'role'];
const UPDATE_FIELDS = ['fullName', 'cpf', 'email', 'mobilePhone', 'role'];

/**
 * Cadastro e edição de responsável (FR-013, FR-014; T091).
 *
 * O formulário não valida nada: entrega o que foi digitado, e o backend devolve todas as falhas de
 * uma vez (FR-017). Cada mensagem aparece junto do seu campo, e o resumo da recusa recebe o foco e
 * leva a cada campo (T234). A senha só existe no cadastro — é provisória, e o responsável a troca no
 * primeiro acesso —; a edição não troca senha.
 *
 * O formulário é `novalidate`: a validação nativa do navegador barrava o envio no primeiro e-mail
 * malformado, com um balão fora do padrão e sem apontar os demais campos (FR-017, QA da T275).
 *
 * Na edição, o formulário só aparece depois de o responsável carregar. Vazio durante a carga, ou
 * depois de uma falha, ele podia ser enviado e gravar em branco por cima dos dados.
 */
@Component({
  selector: 'ovyx-caretaker-form-page',
  imports: [Alert, Button, ErrorSummary, FormField, PageHeader, RouterLink, SelectField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="caretaker-form">
      <ovyx-page-header [title]="editing() ? 'Editar responsável' : 'Novo responsável'" />

      <p class="caretaker-form__status" role="status">{{ state() === 'loading' ? 'Carregando…' : '' }}</p>

      @if (state() === 'missing') {
        <ovyx-alert variant="danger">
          <p>Responsável não encontrado.</p>
        </ovyx-alert>
        <a class="caretaker-form__back" routerLink="/responsaveis">Voltar à lista de responsáveis</a>
      } @else if (state() === 'failed') {
        <ovyx-error-summary
          heading="Não foi possível carregar o responsável:"
          [errors]="notification().errors"
          [fields]="[]"
        />
        <a class="caretaker-form__back" routerLink="/responsaveis">Voltar à lista de responsáveis</a>
      } @else if (state() === 'ready') {
        @if (notification().hasErrors) {
          <ovyx-error-summary [errors]="notification().errors" [fields]="fields()" />
        }

        <form class="caretaker-form__form" novalidate (submit)="submit($event)">
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
              hint="O responsável troca esta senha no primeiro acesso. De 12 a 128 caracteres, com letra e dígito, diferente do e-mail e do CPF."
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

    /* Vazia, sai da tela, mas não da árvore de acessibilidade (T235). */
    .caretaker-form__status:empty {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
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
  private readonly find = inject(FindCaretakerByIdUseCase);
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

  /** O cadastro já nasce pronto; a edição espera o responsável carregar. */
  protected readonly state = signal<'loading' | 'ready' | 'missing' | 'failed'>(
    this.id === null ? 'ready' : 'loading',
  );

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
    // O botão ocupado já barra o segundo clique; o Enter num campo envia o formulário sem passar
    // por ele.
    if (this.submitting()) {
      return;
    }
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
    // Um endereço que não traz um identificador nem chega ao backend: forjado com "../", ele levava a
    // tela de edição a chamar outro endpoint.
    if (!UUID.test(id)) {
      this.state.set('missing');
      return;
    }

    const result = await this.find.execute(id);
    if (!result.success) {
      const missing = result.notification.errors.some(
        (error) => error.code === NOT_FOUND || error.code === INVALID_ID,
      );
      this.notification.set(missing ? Notification.empty() : result.notification);
      this.state.set(missing ? 'missing' : 'failed');
      return;
    }

    const { fullName, cpf, email, mobilePhone, role } = result.value;
    this.form.patchValue({ fullName, cpf, email, mobilePhone, role });
    this.state.set('ready');
  }
}
