import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { Alert } from '../../../../shared/presentation/ui/alert/alert';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { DataTable } from '../../../../shared/presentation/ui/data-table/data-table';
import { EmptyState } from '../../../../shared/presentation/ui/empty-state/empty-state';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { Icon } from '../../../../shared/presentation/ui/icon/icon';
import {
  SegmentOption,
  SegmentedControl,
} from '../../../../shared/presentation/ui/segmented-control/segmented-control';
import { SummaryItem, SummaryStrip } from '../../../../shared/presentation/ui/summary-strip/summary-strip';
import { SwitchField } from '../../../../shared/presentation/ui/switch-field/switch-field';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { ConfirmNoMortalityUseCase } from '../../../application/daily-report/confirm-no-mortality.usecase';
import { ReportCage, percentOf } from '../../../domain/daily-report';
import { countOf, dayOf } from '../../labels/labels';
import { ReportChanges } from '../report-changes';
import { ReportView } from '../report-view';

/**
 * A aba de mortalidade do relatório (US3; FR-011 a FR-014), como a tela Mortalidade do protótipo: a faixa
 * com mortes, descartes, a taxa do dia e o saldo de aves, a chave "Só gaiolas com ocorrência", o filtro
 * de bateria e a tabela das gaiolas.
 *
 * O relatório vem da página ({@link ReportView}). O dia sem ocorrência se confirma aqui, num botão que só
 * aparece enquanto não há morte nem descarte lançado e o dia não foi confirmado. Se a confirmação é
 * recusada — outra pessoa lançou uma ocorrência nesse meio-tempo —, a recusa aparece, e a página busca
 * o relatório de novo. Num setor inativo, a aba só consulta (FR-020).
 */
@Component({
  selector: 'ovyx-mortality-tab-page',
  imports: [
    Alert,
    Button,
    DataTable,
    EmptyState,
    ErrorSummary,
    Icon,
    RouterLink,
    RouterOutlet,
    SegmentedControl,
    SummaryStrip,
    SwitchField,
  ],
  templateUrl: './mortality-tab-page.html',
  styleUrl: './mortality-tab-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MortalityTabPage {
  private readonly confirmNoMortality = inject(ConfirmNoMortalityUseCase);
  private readonly changes = inject(ReportChanges);
  private readonly toaster = inject(Toaster);

  protected readonly report = inject(ReportView).report;

  protected readonly countOf = countOf;

  protected readonly battery = signal('');
  protected readonly onlyOccurrences = signal(false);
  protected readonly confirming = signal(false);
  protected readonly refusal = signal(Notification.empty());

  /** Só o setor ativo recebe lançamento (FR-020). */
  protected readonly writable = computed(() => this.report()?.sector.status === 'ACTIVE');

  /** Se o relatório tem morte ou descarte lançado em alguma gaiola. */
  private readonly hasOccurrence = computed(() => {
    const mortality = this.report()?.mortality;
    return mortality !== undefined && mortality.deaths + mortality.culls > 0;
  });

  /** A confirmação só vale sem ocorrência, e confirmar de novo não muda nada (FR-013). */
  protected readonly canConfirm = computed(
    () => this.writable() && !this.hasOccurrence() && this.report()?.noMortalityConfirmed === false,
  );

  protected readonly confirmed = computed(() => this.report()?.noMortalityConfirmed === true && !this.hasOccurrence());

  protected readonly batteryOptions = computed<readonly SegmentOption[]>(() => {
    const batteries = [...new Set((this.report()?.cages ?? []).map((cage) => cage.battery))];
    return [{ value: '', label: 'Todas' }, ...batteries.map((battery) => ({ value: battery, label: battery }))];
  });

  /** As gaiolas da bateria escolhida e, com a chave ligada, só as que tiveram morte ou descarte. */
  protected readonly cages = computed<readonly ReportCage[]>(() => {
    const battery = this.battery();
    const onlyOccurrences = this.onlyOccurrences();
    return (this.report()?.cages ?? []).filter(
      (cage) =>
        (battery === '' || cage.battery === battery) &&
        (!onlyOccurrences || (cage.mortality?.deaths ?? 0) + (cage.mortality?.culls ?? 0) > 0),
    );
  });

  /** O estado vazio da chave ligada, com a bateria, se houver. */
  protected readonly emptyTitle = computed(() =>
    this.battery() === '' ? 'Nenhuma ocorrência' : `Nenhuma ocorrência na bateria ${this.battery()}`,
  );

  /** Os totais do dia, prontos do backend; a tela só os escreve. */
  protected readonly summary = computed<readonly SummaryItem[]>(() => {
    const mortality = this.report()?.mortality;
    if (!mortality) {
      return [];
    }
    return [
      { label: 'Mortes', value: countOf(mortality.deaths), note: 'aves encontradas mortas' },
      { label: 'Descartes', value: countOf(mortality.culls), note: 'retiradas do plantel' },
      { label: 'Taxa do dia', value: percentOf(mortality.removalRate, 2), note: 'removidos ÷ aves' },
      { label: 'Saldo de aves', value: countOf(mortality.closingBirdCount), note: 'para o próximo relatório' },
    ];
  });

  protected readonly caption = computed(() => {
    const report = this.report();
    return report ? `Mortalidade das gaiolas no relatório de ${dayOf(report.collectionDate)}` : 'Mortalidade das gaiolas';
  });

  protected cageLink(cage: ReportCage): readonly string[] {
    const report = this.report();
    return report ? ['/setores', report.sector.id, 'relatorios', report.id, 'mortalidade', cage.cageId] : [];
  }

  /** A ação de cada linha diz o que faz: lançar a gaiola sem mortalidade, corrigir a lançada. */
  protected actionOf(cage: ReportCage): string {
    return `${cage.mortality ? 'Corrigir' : 'Lançar'} mortalidade da gaiola ${cage.code}`;
  }

  protected async confirmDay(): Promise<void> {
    const report = this.report();
    if (!report || this.confirming()) {
      return;
    }
    this.confirming.set(true);
    const result = await this.confirmNoMortality.execute(report.sector.id, report.id);
    this.confirming.set(false);

    if (!result.success) {
      this.refusal.set(result.notification);
      this.changes.notify();
      return;
    }
    this.refusal.set(Notification.empty());
    this.toaster.show(`Mortalidade de ${dayOf(report.collectionDate)} confirmada sem ocorrência.`);
    this.changes.notify();
  }
}
