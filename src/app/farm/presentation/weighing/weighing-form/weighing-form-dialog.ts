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
import { CorrectWeighingUseCase } from '../../../application/weighing/correct-weighing.usecase';
import { FindWeighingUseCase } from '../../../application/weighing/find-weighing.usecase';
import { RecordWeighingUseCase } from '../../../application/weighing/record-weighing.usecase';
import { dayOf } from '../../labels/labels';
import { WeighingChanges } from '../weighing-changes';

const FIELDS = ['weighedOn', 'averageWeight'];
const NOT_FOUND = new Set(['SECTOR_NOT_FOUND', 'CAGE_NOT_FOUND', 'WEIGHING_NOT_FOUND']);
const INACTIVE = new Set(['SECTOR_INACTIVE', 'CAGE_INACTIVE']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O dia de hoje no relógio de quem pesa, como o campo de data o escreve ("2026-09-24"). */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** O peso como a pessoa o digitaria: a casa decimal com a vírgula, e só quando houver. */
function typedWeightOf(grams: number): string {
  return String(grams).replace('.', ',');
}

/**
 * O registro e a correção de pesagem (US1 e US4 da 005; FR-003 a FR-005, FR-014), em diálogo sobre a tela
 * Peso médio. As rotas `…/peso/nova` e `…/peso/:weighingId` carregam o diálogo; fechar é voltar à tela.
 *
 * O formulário não valida nada: entrega a data e o peso como foram digitados, a vírgula inclusive, e o
 * backend devolve todas as falhas de uma vez, cada uma junto do seu campo — também a do dia já pesado. No
 * registro, a data sugerida é a de hoje; na correção, os campos só aparecem depois de a pesagem carregar.
 */
@Component({
  selector: 'ovyx-weighing-form-dialog',
  imports: [Alert, Button, Dialog, ErrorSummary, FormField],
  templateUrl: './weighing-form-dialog.html',
  styleUrl: './weighing-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeighingFormDialog {
  private readonly record = inject(RecordWeighingUseCase);
  private readonly correct = inject(CorrectWeighingUseCase);
  private readonly find = inject(FindWeighingUseCase);
  private readonly changes = inject(WeighingChanges);
  private readonly toaster = inject(Toaster);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** A gaiola vem da rota da tela, que é a mãe do diálogo. */
  private readonly sectorId =
    this.route.snapshot.paramMap.get('sectorId') ??
    this.route.parent?.snapshot.paramMap.get('sectorId') ??
    '';
  private readonly cageId =
    this.route.snapshot.paramMap.get('cageId') ??
    this.route.parent?.snapshot.paramMap.get('cageId') ??
    '';

  /** A pesagem que se corrige; ausente no registro. */
  private readonly id = this.route.snapshot.paramMap.get('weighingId');

  protected readonly editing = this.id !== null;
  protected readonly fields = FIELDS;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    weighedOn: this.id === null ? today() : '',
    averageWeight: '',
  });

  protected readonly notification = signal(Notification.empty());
  protected readonly submitting = signal(false);

  /** O registro já nasce pronto; a correção espera a pesagem carregar. */
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

  /** Voltar à tela fecha o diálogo. Enquanto grava, não fecha: o resultado já está a caminho. */
  protected close(): void {
    if (!this.submitting()) {
      void this.router.navigate(this.page());
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
        ? await this.record.execute(this.sectorId, this.cageId, input)
        : await this.correct.execute(this.sectorId, this.cageId, this.id, input);
    this.submitting.set(false);

    if (!result.success) {
      this.notification.set(result.notification);
      // A gaiola ou o setor inativados depois que a tela abriu: a tela lê de novo e mostra o aviso.
      if (result.notification.errors.some((error) => INACTIVE.has(error.code))) {
        this.changes.notify();
      }
      return;
    }

    this.notification.set(Notification.empty());
    const day = dayOf(result.value.weighedOn);
    this.toaster.show(
      this.id === null ? `Pesagem de ${day} registrada.` : `Pesagem de ${day} corrigida.`,
    );
    this.changes.notify();
    await this.router.navigate(this.page());
  }

  private page(): readonly string[] {
    return ['/setores', this.sectorId, 'gaiolas', this.cageId, 'peso'];
  }

  private async load(id: string): Promise<void> {
    // Um endereço que não traz um identificador nem chega ao backend: forjado com "../", ele levava o
    // diálogo a chamar outro endpoint.
    if (!UUID.test(id)) {
      this.state.set('missing');
      return;
    }

    const result = await this.find.execute(this.sectorId, this.cageId, id);
    if (!result.success) {
      const missing = result.notification.errors.some((error) => NOT_FOUND.has(error.code));
      this.notification.set(missing ? Notification.empty() : result.notification);
      this.state.set(missing ? 'missing' : 'failed');
      return;
    }

    this.form.setValue({
      weighedOn: result.value.weighedOn,
      averageWeight: typedWeightOf(result.value.averageWeight),
    });
    this.state.set('ready');
    this.focusFirstFieldAfterRender();
  }

  /** Com os campos na tela, o foco vai para o peso, que é o que se corrige — se continua no diálogo. */
  private focusFirstFieldAfterRender(): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const focused = document.activeElement;
        if (!focused || focused === document.body || root.contains(focused)) {
          root.querySelector<HTMLElement>('#averageWeight')?.focus();
        }
      },
      { injector: this.injector },
    );
  }
}
