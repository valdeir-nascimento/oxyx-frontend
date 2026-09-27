import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { Alert } from '../../../../shared/presentation/ui/alert/alert';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { Dialog } from '../../../../shared/presentation/ui/dialog/dialog';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { FormField } from '../../../../shared/presentation/ui/form-field/form-field';
import { SelectField } from '../../../../shared/presentation/ui/select-field/select-field';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { FindCaretakerByIdUseCase } from '../../../application/caretaker/find-caretaker-by-id.usecase';
import { RegisterCaretakerUseCase } from '../../../application/caretaker/register-caretaker.usecase';
import { UpdateCaretakerUseCase } from '../../../application/caretaker/update-caretaker.usecase';
import { Role } from '../../../domain/authenticated-caretaker';
import { ROLE_OPTIONS } from '../../labels/labels';
import { CaretakerChanges } from '../caretaker-changes';

const NOT_FOUND = 'CARETAKER_NOT_FOUND';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REGISTRATION_FIELDS = ['fullName', 'cpf', 'email', 'mobilePhone', 'password', 'role'];
const UPDATE_FIELDS = ['fullName', 'cpf', 'email', 'mobilePhone', 'role'];
const LIST = '/responsaveis';

/**
 * Cadastro e edição de responsável (FR-013, FR-014; T091), em diálogo sobre a lista, como o design
 * system abre os formulários curtos. As rotas `/responsaveis/novo` e `/responsaveis/:id` carregam o
 * diálogo; fechar é voltar à lista, e o foco volta a quem abriu (FocusTrap).
 *
 * O formulário não valida nada: entrega o que foi digitado, e o backend devolve todas as falhas de
 * uma vez (FR-017). Cada mensagem aparece junto do seu campo, e o resumo da recusa recebe o foco e
 * leva a cada campo (T234). A senha só existe no cadastro — é provisória, e o responsável a troca no
 * primeiro acesso —; a edição não troca senha.
 *
 * O formulário é `novalidate`: a validação nativa do navegador barrava o envio no primeiro e-mail
 * malformado, com um balão fora do padrão e sem apontar os demais campos (FR-017, QA da T275).
 *
 * Na edição, os campos só aparecem depois de o responsável carregar. Vazios durante a carga, ou
 * depois de uma falha, eles podiam ser enviados e gravar em branco por cima dos dados.
 *
 * Ao gravar, o diálogo confirma num toast, avisa a lista por `CaretakerChanges` — ela busca de novo a
 * página em que está — e fecha.
 */
@Component({
  selector: 'ovyx-caretaker-form-dialog',
  imports: [Alert, Button, Dialog, ErrorSummary, FormField, SelectField],
  templateUrl: './caretaker-form-dialog.html',
  styleUrl: './caretaker-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaretakerFormDialog {
  private readonly register = inject(RegisterCaretakerUseCase);
  private readonly update = inject(UpdateCaretakerUseCase);
  private readonly find = inject(FindCaretakerByIdUseCase);
  private readonly changes = inject(CaretakerChanges);
  private readonly toaster = inject(Toaster);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Identificador de quem se edita; ausente no cadastro. */
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly editing = this.id !== null;
  protected readonly fields = this.editing ? UPDATE_FIELDS : REGISTRATION_FIELDS;

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

  /** O nome de quem se edita, como carregou; o que se digita no campo não muda o título. */
  private readonly loadedName = signal('');

  protected readonly subtitle = computed(() =>
    this.editing ? this.loadedName() : 'O responsável troca a senha provisória no primeiro acesso.',
  );

  constructor() {
    if (this.id !== null) {
      void this.load(this.id);
    }
  }

  protected messageFor(field: string): string | undefined {
    return this.notification().messageFor(field);
  }

  /** Voltar à lista fecha o diálogo. Enquanto grava, não fecha: o resultado já está a caminho. */
  protected close(): void {
    if (!this.submitting()) {
      void this.router.navigate([LIST]);
    }
  }

  protected async submit(): Promise<void> {
    // O botão ocupado já barra o segundo clique; o Enter num campo envia o formulário sem passar
    // por ele. Nada se envia antes de o responsável carregar.
    if (this.submitting() || this.state() !== 'ready') {
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
    this.toaster.show(
      this.id === null
        ? `Responsável cadastrado: ${result.value.fullName}.`
        : `Alterações salvas: ${result.value.fullName}.`,
    );
    this.changes.notify();
    await this.router.navigate([LIST]);
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
      const missing = result.notification.errors.some((error) => error.code === NOT_FOUND);
      this.notification.set(missing ? Notification.empty() : result.notification);
      this.state.set(missing ? 'missing' : 'failed');
      return;
    }

    const { fullName, cpf, email, mobilePhone, role } = result.value;
    this.form.patchValue({ fullName, cpf, email, mobilePhone, role });
    this.loadedName.set(fullName);
    this.state.set('ready');
    this.focusFirstFieldAfterRender();
  }

  /**
   * O diálogo abriu com o foco no "Fechar", o único alvo enquanto carregava; com os campos na tela, o
   * foco vai para o primeiro — se continua no diálogo, e a pessoa não o levou para outro lugar.
   */
  private focusFirstFieldAfterRender(): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const focused = document.activeElement;
        if (!focused || focused === document.body || root.contains(focused)) {
          root.querySelector<HTMLElement>('#fullName')?.focus();
        }
      },
      { injector: this.injector },
    );
  }
}
