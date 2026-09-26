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
import { FindReportCageUseCase } from '../../../application/daily-report/find-report-cage.usecase';
import { RecordProductionUseCase } from '../../../application/daily-report/record-production.usecase';
import { ReportCage } from '../../../domain/daily-report';
import { countOf, dayOf, notFoundMessageOf } from '../../labels/labels';
import { ReportChanges } from '../report-changes';
import { ReportView } from '../report-view';
import { paramOf } from '../route-params';

const FIELDS = ['eggs', 'small', 'jumbo', 'dirty', 'cracked', 'bloodSpot', 'abnormal'];
const SECTOR_INACTIVE = 'SECTOR_INACTIVE';

/** As seis classificações, na ordem do protótipo. */
const GRADES = [
  { id: 'small', label: 'Pequenos' },
  { id: 'jumbo', label: 'Jumbo' },
  { id: 'dirty', label: 'Sujos' },
  { id: 'cracked', label: 'Trincados' },
  { id: 'bloodSpot', label: 'Com sangue' },
  { id: 'abnormal', label: 'Anormais' },
] as const;

/**
 * Lançamento ou correção da produção de uma gaiola (US2; FR-007 a FR-010, FR-018), em diálogo sobre a
 * aba de produção. A rota `:cageId`, filha de `producao`, carrega o diálogo; fechar é voltar à aba.
 *
 * Os campos vêm com a produção já lançada, se houver. O formulário não valida nada: entrega o que foi
 * digitado, e o backend devolve todas as falhas de uma vez, a da soma das classificações no campo dos
 * ovos. Classificação em branco vale zero.
 *
 * A recusa porque o setor está inativo — inativado com o diálogo aberto — avisa a página, que busca de
 * novo e passa a mostrar o aviso.
 */
@Component({
  selector: 'ovyx-production-dialog',
  imports: [Alert, Button, Dialog, ErrorSummary, FormField],
  templateUrl: './production-dialog.html',
  styleUrl: './production-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionDialog {
  private readonly find = inject(FindReportCageUseCase);
  private readonly record = inject(RecordProductionUseCase);
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
  protected readonly grades = GRADES;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    eggs: '',
    small: '',
    jumbo: '',
    dirty: '',
    cracked: '',
    bloodSpot: '',
    abnormal: '',
  });

  protected readonly notification = signal(Notification.empty());
  protected readonly submitting = signal(false);
  protected readonly state = signal<'loading' | 'ready' | 'missing' | 'failed'>('loading');
  /** O que não foi encontrado: a gaiola, o relatório ou o setor. */
  protected readonly missing = signal('');
  private readonly cage = signal<ReportCage | null>(null);

  protected readonly title = computed(() => {
    const cage = this.cage();
    return cage ? `Produção · ${cage.code}` : 'Produção';
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
    const result = await this.record.execute(this.sectorId, this.reportId, this.cageId, this.form.getRawValue());
    this.submitting.set(false);

    if (!result.success) {
      this.notification.set(result.notification);
      if (result.notification.errors.some((error) => error.code === SECTOR_INACTIVE)) {
        this.changes.notify();
      }
      return;
    }

    this.notification.set(Notification.empty());
    this.toaster.show(`Produção da gaiola ${cage.code} salva.`);
    this.changes.notify();
    await this.router.navigate(this.tab());
  }

  private tab(): string[] {
    return ['/setores', this.sectorId, 'relatorios', this.reportId, 'producao'];
  }

  private async load(): Promise<void> {
    const result = await this.find.execute(this.sectorId, this.reportId, this.cageId);
    if (!result.success) {
      const missing = notFoundMessageOf(result.notification.errors);
      this.missing.set(missing ?? '');
      this.notification.set(missing ? Notification.empty() : result.notification);
      this.state.set(missing ? 'missing' : 'failed');
      return;
    }

    const production = result.value.production;
    if (production) {
      this.form.patchValue({
        eggs: String(production.eggs),
        small: String(production.small),
        jumbo: String(production.jumbo),
        dirty: String(production.dirty),
        cracked: String(production.cracked),
        bloodSpot: String(production.bloodSpot),
        abnormal: String(production.abnormal),
      });
    }
    this.cage.set(result.value);
    this.state.set('ready');
    this.focusFirstFieldAfterRender();
  }

  /** Com os campos na tela, o foco vai para os ovos — se continua no diálogo. */
  private focusFirstFieldAfterRender(): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const focused = document.activeElement;
        if (!focused || focused === document.body || root.contains(focused)) {
          root.querySelector<HTMLElement>('#eggs')?.focus();
        }
      },
      { injector: this.injector },
    );
  }
}
