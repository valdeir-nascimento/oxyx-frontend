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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { Alert } from '../../../../shared/presentation/ui/alert/alert';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { Dialog } from '../../../../shared/presentation/ui/dialog/dialog';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { FormField } from '../../../../shared/presentation/ui/form-field/form-field';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { CorrectDailyReportUseCase } from '../../../application/daily-report/correct-daily-report.usecase';
import { FindDailyReportUseCase } from '../../../application/daily-report/find-daily-report.usecase';
import { ListDailyReportsUseCase } from '../../../application/daily-report/list-daily-reports.usecase';
import { OpenDailyReportUseCase } from '../../../application/daily-report/open-daily-report.usecase';
import { SuggestDailyReportUseCase } from '../../../application/daily-report/suggest-daily-report.usecase';
import { DailyReportInput } from '../../../domain/daily-report';
import { dayOf, notFoundMessageOf } from '../../labels/labels';
import { ReportChanges } from '../report-changes';
import { paramOf } from '../route-params';

const FIELDS = ['collectionDate', 'collectionTime', 'openingBirdCount', 'flockAge', 'note'];
const ALREADY_EXISTS = 'DAILY_REPORT_ALREADY_EXISTS';

/** O relatório que já existe no dia pedido: o dia e o caminho para ele. */
interface ExistingReport {
  readonly day: string;
  readonly route: readonly string[];
}

/**
 * Abertura do relatório do dia (US1; FR-001 a FR-004, FR-018) e correção dos dados gerais (US4; FR-003),
 * em diálogo. A rota `novo`, filha da lista, abre um relatório; a rota `editar`, filha de cada aba,
 * corrige o relatório do endereço, e a volta é para a aba de onde saiu (`data.tab`).
 *
 * Na abertura, os campos vêm sugeridos pelo backend: a data e a hora de agora na granja, as aves pelo
 * saldo do relatório anterior e a idade dele. Na correção, vêm com o relatório. O formulário não valida
 * nada: entrega o que foi digitado, e o backend devolve todas as falhas de uma vez. Quando o dia já tem
 * relatório, o diálogo procura o relatório pela data e oferece o caminho para ele (FR-002).
 */
@Component({
  selector: 'ovyx-report-dialog',
  imports: [Alert, Button, Dialog, ErrorSummary, FormField, RouterLink],
  templateUrl: './report-dialog.html',
  styleUrl: './report-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDialog {
  private readonly suggest = inject(SuggestDailyReportUseCase);
  private readonly open = inject(OpenDailyReportUseCase);
  private readonly listReports = inject(ListDailyReportsUseCase);
  private readonly find = inject(FindDailyReportUseCase);
  private readonly correct = inject(CorrectDailyReportUseCase);
  private readonly changes = inject(ReportChanges);
  private readonly toaster = inject(Toaster);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute).snapshot;

  private readonly sectorId = paramOf(this.route, 'sectorId');
  /** O relatório que se corrige; vazio na abertura. */
  private readonly reportId = paramOf(this.route, 'reportId');

  protected readonly editing = this.reportId !== '';
  /** A aba de onde a correção saiu, e para onde volta. */
  private readonly tab = this.editing ? ((this.route.data['tab'] as string | undefined) ?? 'producao') : '';

  protected readonly fields = FIELDS;
  protected readonly title = this.editing ? 'Editar relatório' : 'Novo relatório';

  protected readonly form = inject(FormBuilder).nonNullable.group({
    collectionDate: '',
    collectionTime: '',
    openingBirdCount: '',
    flockAge: '',
    note: '',
  });

  protected readonly notification = signal(Notification.empty());
  protected readonly submitting = signal(false);
  protected readonly existing = signal<ExistingReport | null>(null);
  /** A abertura já nasce pronta; a correção espera o relatório carregar. */
  protected readonly state = signal<'loading' | 'ready' | 'missing' | 'failed'>(this.editing ? 'loading' : 'ready');
  /** O que não foi encontrado: o relatório ou o setor. */
  protected readonly missing = signal('');

  constructor() {
    void (this.editing ? this.loadReport() : this.loadSuggestion());
  }

  protected messageFor(field: string): string | undefined {
    return this.notification().messageFor(field);
  }

  /** Fechar volta à lista, na abertura, ou à aba, na correção. Enquanto grava, não fecha. */
  protected close(): void {
    if (!this.submitting()) {
      void this.router.navigate(this.back());
    }
  }

  protected async submit(): Promise<void> {
    if (this.submitting() || this.state() !== 'ready') {
      return;
    }
    const input = this.form.getRawValue();

    this.submitting.set(true);
    this.existing.set(null);
    const result = this.editing
      ? await this.correct.execute(this.sectorId, this.reportId, input)
      : await this.open.execute(this.sectorId, input);
    this.submitting.set(false);

    if (!result.success) {
      this.notification.set(result.notification);
      if (result.notification.errors.some((error) => error.code === ALREADY_EXISTS)) {
        await this.findExisting(input.collectionDate);
      }
      return;
    }

    this.notification.set(Notification.empty());
    // O dia é o digitado: o backend só aceita a data como o campo de data a envia.
    this.toaster.show(`Relatório de ${dayOf(input.collectionDate)} ${this.editing ? 'corrigido' : 'aberto'}.`);
    this.changes.notify();
    await this.router.navigate(this.editing ? this.back() : [...this.list(), result.value.id]);
  }

  private list(): string[] {
    return ['/setores', this.sectorId, 'relatorios'];
  }

  private back(): string[] {
    return this.editing ? [...this.list(), this.reportId, this.tab] : this.list();
  }

  private async loadSuggestion(): Promise<void> {
    const result = await this.suggest.execute(this.sectorId);
    if (!result.success) {
      // Sem sugestão, o formulário abre vazio, com o motivo.
      this.notification.set(result.notification);
      return;
    }
    const { collectionDate, collectionTime, openingBirdCount, flockAge } = result.value;
    this.form.patchValue({
      collectionDate,
      collectionTime,
      openingBirdCount: String(openingBirdCount),
      flockAge: flockAge === undefined ? '' : String(flockAge),
    });
  }

  private async loadReport(): Promise<void> {
    const result = await this.find.execute(this.sectorId, this.reportId);
    if (!result.success) {
      const missing = notFoundMessageOf(result.notification.errors);
      this.missing.set(missing ?? '');
      this.notification.set(missing ? Notification.empty() : result.notification);
      this.state.set(missing ? 'missing' : 'failed');
      return;
    }
    const report = result.value;
    const input: DailyReportInput = {
      collectionDate: report.collectionDate,
      collectionTime: report.collectionTime,
      openingBirdCount: String(report.openingBirdCount),
      flockAge: String(report.flockAge),
      note: report.note ?? '',
    };
    this.form.setValue(input);
    this.state.set('ready');
    this.focusFirstFieldAfterRender();
  }

  /** O relatório do dia que a recusa apontou, para o caminho até ele. */
  private async findExisting(collectionDate: string): Promise<void> {
    const result = await this.listReports.execute(this.sectorId, { collectionDate, page: 0, size: 1 });
    const found = result.success ? result.value.content[0] : undefined;
    if (found) {
      this.existing.set({ day: dayOf(found.collectionDate), route: [...this.list(), found.id] });
    }
  }

  /** Com os campos na tela, o foco vai para a data — se continua no diálogo. */
  private focusFirstFieldAfterRender(): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const focused = document.activeElement;
        if (!focused || focused === document.body || root.contains(focused)) {
          root.querySelector<HTMLElement>('#collectionDate')?.focus();
        }
      },
      { injector: this.injector },
    );
  }
}
