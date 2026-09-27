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
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { FindCageByIdUseCase } from '../../../application/cage/find-cage-by-id.usecase';
import { RegisterCageUseCase } from '../../../application/cage/register-cage.usecase';
import { UpdateCageUseCase } from '../../../application/cage/update-cage.usecase';
import { cageCodeOf } from '../../../domain/cage';
import { CageChanges } from '../cage-changes';

const MISSING_CODES = ['CAGE_NOT_FOUND', 'SECTOR_NOT_FOUND'];
const SECTOR_INACTIVE = 'SECTOR_INACTIVE';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELDS = ['battery', 'number', 'birdCount'];

/**
 * Cadastro e edição de gaiola (US2; FR-006, FR-009, FR-020), em diálogo sobre as gaiolas do setor. As
 * rotas `nova` e `:cageId`, filhas de `/setores/:sectorId/gaiolas`, carregam o diálogo; fechar é voltar
 * às gaiolas do setor.
 *
 * O formulário não valida nada: entrega o que foi digitado, inclusive o número e as aves, e o backend
 * devolve todas as falhas de uma vez, a de número que não é inteiro inclusive (FR-017). Os campos de
 * quantidade abrem o teclado numérico, e continuam de texto.
 *
 * Na edição, o título mostra o código da gaiola, montado aqui com `cageCodeOf` a partir do que carregou.
 *
 * A recusa porque o setor está inativo — outro administrador o inativou com o diálogo aberto — avisa a
 * lista por trás, que busca de novo e passa a mostrar o aviso (QA N-7).
 */
@Component({
  selector: 'ovyx-cage-form-dialog',
  imports: [Alert, Button, Dialog, ErrorSummary, FormField],
  templateUrl: './cage-form-dialog.html',
  styleUrl: './cage-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CageFormDialog {
  private readonly register = inject(RegisterCageUseCase);
  private readonly update = inject(UpdateCageUseCase);
  private readonly find = inject(FindCageByIdUseCase);
  private readonly changes = inject(CageChanges);
  private readonly toaster = inject(Toaster);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute).snapshot;

  /** O setor vem da rota da lista, mãe desta. */
  private readonly sectorId =
    this.route.paramMap.get('sectorId') ?? this.route.parent?.paramMap.get('sectorId') ?? '';

  /** Identificador da gaiola que se edita; ausente no cadastro. */
  private readonly id = this.route.paramMap.get('cageId');

  protected readonly editing = this.id !== null;
  protected readonly fields = FIELDS;

  protected readonly form = inject(FormBuilder).nonNullable.group({ battery: '', number: '', birdCount: '' });

  protected readonly notification = signal(Notification.empty());
  protected readonly submitting = signal(false);

  /** O cadastro já nasce pronto; a edição espera a gaiola carregar. */
  protected readonly state = signal<'loading' | 'ready' | 'missing' | 'failed'>(
    this.id === null ? 'ready' : 'loading',
  );

  /** O código da gaiola como carregou; o que se digita não muda o título. */
  private readonly loadedCode = signal('');

  protected readonly title = computed(() => (this.editing ? `Editar gaiola ${this.loadedCode()}`.trim() : 'Nova gaiola'));

  constructor() {
    if (this.id !== null) {
      void this.load(this.id);
    }
  }

  protected messageFor(field: string): string | undefined {
    return this.notification().messageFor(field);
  }

  /** Voltar às gaiolas fecha o diálogo. Enquanto grava, não fecha: o resultado já está a caminho. */
  protected close(): void {
    if (!this.submitting()) {
      void this.router.navigate(this.list());
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
        ? await this.register.execute(this.sectorId, input)
        : await this.update.execute(this.sectorId, this.id, input);
    this.submitting.set(false);

    if (!result.success) {
      this.notification.set(result.notification);
      if (result.notification.errors.some((error) => error.code === SECTOR_INACTIVE)) {
        this.changes.notify();
      }
      return;
    }

    this.notification.set(Notification.empty());
    this.toaster.show(
      this.id === null ? `Gaiola cadastrada: ${result.value.code}.` : `Alterações salvas: ${result.value.code}.`,
    );
    this.changes.notify();
    await this.router.navigate(this.list());
  }

  private list(): unknown[] {
    return ['/setores', this.sectorId, 'gaiolas'];
  }

  private async load(id: string): Promise<void> {
    // Um endereço que não traz um identificador nem chega ao backend: forjado com "../", ele levava a
    // tela de edição a chamar outro endpoint.
    if (!UUID.test(id)) {
      this.state.set('missing');
      return;
    }

    const result = await this.find.execute(this.sectorId, id);
    if (!result.success) {
      const missing = result.notification.errors.some((error) => MISSING_CODES.includes(error.code));
      this.notification.set(missing ? Notification.empty() : result.notification);
      this.state.set(missing ? 'missing' : 'failed');
      return;
    }

    const { battery, number, birdCount } = result.value;
    this.form.patchValue({ battery, number: String(number), birdCount: String(birdCount) });
    this.loadedCode.set(cageCodeOf(battery, number));
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
          root.querySelector<HTMLElement>('#battery')?.focus();
        }
      },
      { injector: this.injector },
    );
  }
}
