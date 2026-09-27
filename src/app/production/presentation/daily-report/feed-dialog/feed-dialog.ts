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
import {
  SelectField,
  SelectOption,
} from '../../../../shared/presentation/ui/select-field/select-field';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { FindReportCageUseCase } from '../../../application/daily-report/find-report-cage.usecase';
import { ListActiveFormulasUseCase } from '../../../application/daily-report/list-active-formulas.usecase';
import { RecordFeedUseCase } from '../../../application/daily-report/record-feed.usecase';
import { FeedFormulaOption, ReportCage } from '../../../domain/daily-report';
import { countOf, dayOf, moneyOf, notFoundMessageOf } from '../../labels/labels';
import { ReportChanges } from '../report-changes';
import { ReportView } from '../report-view';
import { paramOf } from '../route-params';

const FIELDS = ['formulaId', 'consumption'];
const SECTOR_INACTIVE = 'SECTOR_INACTIVE';

/** O rótulo de uma fórmula na lista: o nome e o preço por quilo. */
function optionOf(formula: FeedFormulaOption, suffix = ''): SelectOption {
  return {
    value: formula.id,
    label: `${formula.name} · ${moneyOf(formula.pricePerKg)}/kg${suffix}`,
  };
}

/**
 * Lançamento ou correção da ração de uma gaiola (US3 da 004; FR-010, FR-011, FR-020), em diálogo sobre a
 * aba Ração, como o diálogo "Ração · B-07" do protótipo. A rota `:cageId`, filha de `racao`, carrega o
 * diálogo; fechar é voltar à aba.
 *
 * A lista oferece as fórmulas ativas e, se a gaiola já usa uma que foi inativada, também essa, marcada:
 * corrigir só o consumo mantém o preço guardado no lançamento (R-005). O formulário não valida nada: o
 * backend devolve todas as falhas de uma vez, a fórmula antes do consumo. O consumo abre o teclado numérico
 * e continua de texto.
 *
 * A recusa porque o setor está inativo avisa a página, que busca de novo e passa a mostrar o aviso.
 */
@Component({
  selector: 'ovyx-feed-dialog',
  imports: [Alert, Button, Dialog, ErrorSummary, FormField, SelectField],
  templateUrl: './feed-dialog.html',
  styleUrl: './feed-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedDialog {
  private readonly find = inject(FindReportCageUseCase);
  private readonly listFormulas = inject(ListActiveFormulasUseCase);
  private readonly record = inject(RecordFeedUseCase);
  private readonly changes = inject(ReportChanges);
  private readonly toaster = inject(Toaster);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly view = inject(ReportView, { optional: true });
  private readonly route = inject(ActivatedRoute).snapshot;

  private readonly sectorId = paramOf(this.route, 'sectorId');
  private readonly reportId = paramOf(this.route, 'reportId');
  private readonly cageId = paramOf(this.route, 'cageId');

  protected readonly fields = FIELDS;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    formulaId: '',
    consumption: '',
  });

  protected readonly notification = signal(Notification.empty());
  protected readonly submitting = signal(false);
  protected readonly state = signal<'loading' | 'ready' | 'missing' | 'failed'>('loading');
  /** O que não foi encontrado: a gaiola, o relatório ou o setor. */
  protected readonly missing = signal('');
  protected readonly options = signal<readonly SelectOption[]>([]);
  private readonly cage = signal<ReportCage | null>(null);

  protected readonly title = computed(() => {
    const cage = this.cage();
    return cage ? `Ração · ${cage.code}` : 'Ração';
  });

  /** As aves da gaiola e o dia do relatório, como o protótipo. */
  protected readonly subtitle = computed(() => {
    const cage = this.cage();
    if (!cage) {
      return '';
    }
    const birds = cage.birdCount === 1 ? '1 ave' : `${countOf(cage.birdCount)} aves`;
    const report = this.view?.report();
    return report ? `${birds} · relatório de ${dayOf(report.collectionDate)}` : birds;
  });

  constructor() {
    void this.load();
  }

  protected messageFor(field: string): string | undefined {
    return this.notification().messageFor(field);
  }

  /** Voltar à aba fecha o diálogo. Enquanto grava, não fecha: o resultado já está a caminho. */
  protected close(): void {
    if (!this.submitting()) {
      void this.router.navigate(this.tab());
    }
  }

  protected async submit(): Promise<void> {
    const cage = this.cage();
    if (this.submitting() || this.state() !== 'ready' || !cage) {
      return;
    }

    this.submitting.set(true);
    const result = await this.record.execute(
      this.sectorId,
      this.reportId,
      this.cageId,
      this.form.getRawValue(),
    );
    this.submitting.set(false);

    if (!result.success) {
      this.notification.set(result.notification);
      if (result.notification.errors.some((error) => error.code === SECTOR_INACTIVE)) {
        this.changes.notify();
      }
      return;
    }

    this.notification.set(Notification.empty());
    this.toaster.show(`Ração da gaiola ${cage.code} salva.`);
    this.changes.notify();
    await this.router.navigate(this.tab());
  }

  private tab(): string[] {
    return ['/setores', this.sectorId, 'relatorios', this.reportId, 'racao'];
  }

  private async load(): Promise<void> {
    const [found, formulas] = await Promise.all([
      this.find.execute(this.sectorId, this.reportId, this.cageId),
      this.listFormulas.execute(),
    ]);
    if (!found.success) {
      const missing = notFoundMessageOf(found.notification.errors);
      this.missing.set(missing ?? '');
      this.notification.set(missing ? Notification.empty() : found.notification);
      this.state.set(missing ? 'missing' : 'failed');
      return;
    }
    if (!formulas.success) {
      this.notification.set(formulas.notification);
      this.state.set('failed');
      return;
    }

    const feed = found.value.feed;
    const active = formulas.value;
    // A fórmula que a gaiola já usa continua na lista, mesmo inativada: corrigir só o consumo a mantém.
    const kept =
      feed && !active.some((formula) => formula.id === feed.formulaId)
        ? [
            optionOf(
              {
                id: feed.formulaId,
                name: feed.formulaName,
                pricePerKg: feed.pricePerKg,
                expectedIntake: feed.expectedIntake,
              },
              ' (inativa)',
            ),
          ]
        : [];
    this.options.set([
      { value: '', label: 'Escolha a fórmula' },
      ...active.map((formula) => optionOf(formula)),
      ...kept,
    ]);
    if (feed) {
      this.form.setValue({ formulaId: feed.formulaId, consumption: String(feed.consumption) });
    }
    this.cage.set(found.value);
    this.state.set('ready');
    this.focusFirstFieldAfterRender();
  }

  /** Com os campos na tela, o foco vai para a fórmula — se continua no diálogo. */
  private focusFirstFieldAfterRender(): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const focused = document.activeElement;
        if (!focused || focused === document.body || root.contains(focused)) {
          root.querySelector<HTMLElement>('#formulaId')?.focus();
        }
      },
      { injector: this.injector },
    );
  }
}
