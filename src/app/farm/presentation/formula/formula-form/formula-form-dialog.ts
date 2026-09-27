import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
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
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { FindFeedFormulaUseCase } from '../../../application/formula/find-feed-formula.usecase';
import { RegisterFeedFormulaUseCase } from '../../../application/formula/register-feed-formula.usecase';
import { UpdateFeedFormulaUseCase } from '../../../application/formula/update-feed-formula.usecase';
import { FormulaChanges } from '../formula-changes';

const NOT_FOUND = 'FEED_FORMULA_NOT_FOUND';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELDS = ['name', 'pricePerKg', 'expectedIntake', 'description'];
const LIST = '/formulas';

/**
 * O preço como a pessoa o digitaria: duas casas, com a vírgula, e sem o ponto de milhar, que o backend
 * recusa ("1.000,00" seria ambíguo, R-011 da 004).
 */
function typedPriceOf(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/**
 * Cadastro e edição de fórmula de ração (US1 da 004; FR-001, FR-003, FR-020), em diálogo sobre a lista.
 * As rotas `/formulas/nova` e `/formulas/:formulaId` carregam o diálogo; fechar é voltar à lista.
 *
 * O formulário não valida nada: entrega o que foi digitado, o preço com a vírgula inclusive, e o backend
 * devolve todas as falhas de uma vez, cada uma junto do seu campo. O preço abre o teclado decimal, e o
 * consumo esperado, o numérico; os dois continuam de texto.
 *
 * Na edição, os campos só aparecem depois de a fórmula carregar: vazios, podiam ser enviados e gravar em
 * branco por cima dos dados.
 */
@Component({
  selector: 'ovyx-formula-form-dialog',
  imports: [Alert, Button, Dialog, ErrorSummary, FormField],
  templateUrl: './formula-form-dialog.html',
  styleUrl: './formula-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaFormDialog {
  private readonly register = inject(RegisterFeedFormulaUseCase);
  private readonly update = inject(UpdateFeedFormulaUseCase);
  private readonly find = inject(FindFeedFormulaUseCase);
  private readonly changes = inject(FormulaChanges);
  private readonly toaster = inject(Toaster);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Identificador da fórmula que se edita; ausente no cadastro. */
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('formulaId');

  protected readonly editing = this.id !== null;
  protected readonly fields = FIELDS;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: '',
    pricePerKg: '',
    expectedIntake: '',
    description: '',
  });

  protected readonly notification = signal(Notification.empty());
  protected readonly submitting = signal(false);

  /** O cadastro já nasce pronto; a edição espera a fórmula carregar. */
  protected readonly state = signal<'loading' | 'ready' | 'missing' | 'failed'>(
    this.id === null ? 'ready' : 'loading',
  );

  /** O nome da fórmula como carregou; o que se digita no campo não muda o subtítulo. */
  protected readonly loadedName = signal('');

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
    if (this.submitting() || this.state() !== 'ready') {
      return;
    }
    const input = this.form.getRawValue();

    this.submitting.set(true);
    const result =
      this.id === null
        ? await this.register.execute(input)
        : await this.update.execute(this.id, input);
    this.submitting.set(false);

    if (!result.success) {
      this.notification.set(result.notification);
      return;
    }

    this.notification.set(Notification.empty());
    this.toaster.show(
      this.id === null
        ? `Fórmula cadastrada: ${result.value.name}.`
        : `Alterações salvas: ${result.value.name}.`,
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

    const { name, pricePerKg, expectedIntake, description } = result.value;
    this.form.setValue({
      name,
      pricePerKg: typedPriceOf(pricePerKg),
      expectedIntake: String(expectedIntake),
      description: description ?? '',
    });
    this.loadedName.set(name);
    this.state.set('ready');
    this.focusFirstFieldAfterRender();
  }

  /** Com os campos na tela, o foco vai para o primeiro — se continua no diálogo. */
  private focusFirstFieldAfterRender(): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const focused = document.activeElement;
        if (!focused || focused === document.body || root.contains(focused)) {
          root.querySelector<HTMLElement>('#name')?.focus();
        }
      },
      { injector: this.injector },
    );
  }
}
