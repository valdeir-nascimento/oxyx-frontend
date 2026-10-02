import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import { Notification } from '../../../../shared/domain/notification';
import { Alert } from '../../../../shared/presentation/ui/alert/alert';
import { ConfirmDialog } from '../../../../shared/presentation/ui/confirm-dialog/confirm-dialog';
import { DataTable } from '../../../../shared/presentation/ui/data-table/data-table';
import { EmptyState } from '../../../../shared/presentation/ui/empty-state/empty-state';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { Icon } from '../../../../shared/presentation/ui/icon/icon';
import { IconButton } from '../../../../shared/presentation/ui/icon-button/icon-button';
import {
  ChartBand,
  ChartPoint,
  LineChart,
} from '../../../../shared/presentation/ui/line-chart/line-chart';
import { PageHeader } from '../../../../shared/presentation/ui/page-header/page-header';
import {
  SummaryItem,
  SummaryStrip,
} from '../../../../shared/presentation/ui/summary-strip/summary-strip';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { GetWeighingOverviewUseCase } from '../../../application/weighing/get-weighing-overview.usecase';
import { VoidWeighingUseCase } from '../../../application/weighing/void-weighing.usecase';
import { WeighingHistoryEntry, WeighingOverview } from '../../../domain/weighing';
import { changeOf, countOf, dayOf, nextWeighingTextOf, weightOf } from '../../labels/labels';
import { WeighingChanges } from '../weighing-changes';

const NOT_FOUND = new Set(['SECTOR_NOT_FOUND', 'CAGE_NOT_FOUND']);

/** As recusas da exclusão que dizem que a tela está velha: a pesagem sumiu, ou a gaiola não recebe mais. */
const STALE = new Set([
  'WEIGHING_NOT_FOUND',
  'CAGE_NOT_FOUND',
  'SECTOR_NOT_FOUND',
  'CAGE_INACTIVE',
  'SECTOR_INACTIVE',
]);

/**
 * A tela Peso médio da gaiola (US1 e US3 da 005; FR-009 a FR-013), como a do protótipo: o histórico das
 * pesagens, da mais recente para a mais antiga, com a variação de uma semana para a outra.
 *
 * Qualquer responsável registra e corrige: o diálogo abre sobre a tela, pelas rotas filhas `nova` e
 * `:weighingId`. Excluir pede confirmação e anula a pesagem, que sai do histórico e do gráfico (FR-006).
 * Numa gaiola ou num setor inativos, a tela só consulta (FR-008). As contas vêm prontas do backend (R-008).
 */
@Component({
  selector: 'ovyx-weighing-page',
  imports: [
    Alert,
    ConfirmDialog,
    DataTable,
    EmptyState,
    ErrorSummary,
    Icon,
    IconButton,
    LineChart,
    PageHeader,
    RouterLink,
    RouterOutlet,
    SummaryStrip,
  ],
  templateUrl: './weighing-page.html',
  styleUrl: './weighing-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeighingPage {
  private readonly getOverview = inject(GetWeighingOverviewUseCase);
  private readonly voidWeighing = inject(VoidWeighingUseCase);
  private readonly toaster = inject(Toaster);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly params = inject(ActivatedRoute).snapshot.paramMap;

  protected readonly sectorId = this.params.get('sectorId') ?? '';
  protected readonly cageId = this.params.get('cageId') ?? '';

  protected readonly dayOf = dayOf;
  protected readonly weightOf = weightOf;
  protected readonly changeOf = changeOf;

  protected readonly overview = signal<WeighingOverview | null>(null);

  /** A próxima pesagem da gaiola, pela agenda do setor (feature 010); vazia sem agenda. */
  protected readonly nextWeighing = computed(() => nextWeighingTextOf(this.overview()?.schedule));
  protected readonly loading = signal(true);
  protected readonly missing = signal(false);
  protected readonly refusal = signal(Notification.empty());

  /** A pesagem cuja exclusão espera confirmação. */
  protected readonly confirming = signal<WeighingHistoryEntry | null>(null);
  protected readonly voiding = signal(false);
  protected readonly exclusionRefusal = signal(Notification.empty());

  /** A gaiola e o setor ativos recebem pesagem; senão, a tela só consulta (FR-008). */
  protected readonly writable = computed(() => {
    const overview = this.overview();
    return overview?.cage.status === 'ACTIVE' && overview.sector.status === 'ACTIVE';
  });

  /** Por que a tela só consulta: o setor inativo vem antes, porque inativa as gaiolas junto. */
  protected readonly readOnlyNotice = computed(() => {
    const overview = this.overview();
    if (!overview) {
      return '';
    }
    if (overview.sector.status !== 'ACTIVE') {
      return 'O setor está inativo; as pesagens da gaiola são só para consulta.';
    }
    return overview.cage.status !== 'ACTIVE'
      ? 'A gaiola está inativa; as pesagens dela são só para consulta.'
      : '';
  });

  protected readonly eyebrow = computed(() => {
    const overview = this.overview();
    return overview ? `${overview.sector.name} · Gaiola ${overview.cage.code}` : 'Gaiola';
  });

  /** Sem pesagem, a tela convida à primeira, sem resumo, gráfico nem tabela (FR-013). */
  protected readonly weighed = computed(() => (this.overview()?.history.length ?? 0) > 0);

  /** A faixa do setor, como a tela a escreve: "155–175 g". */
  private readonly range = computed(() => {
    const range = this.overview()?.sector.referenceWeight;
    return range ? `${countOf(range.minimum)}–${countOf(range.maximum)} g` : null;
  });

  /** A última pesagem, a variação em 4 semanas, as aves e a situação diante da faixa (FR-009). */
  protected readonly summary = computed<readonly SummaryItem[]>(() => {
    const overview = this.overview();
    if (!overview?.latest) {
      return [];
    }
    const change = overview.fourWeekChange;
    const range = this.range();
    return [
      {
        label: 'Última pesagem',
        value: weightOf(overview.latest.averageWeight),
        note: dayOf(overview.latest.weighedOn),
      },
      {
        label: 'Variação em 4 semanas',
        value: change ? changeOf(change.change) : '—',
        note: change
          ? `desde ${dayOf(change.since).slice(0, 5)}`
          : 'sem pesagem de 4 semanas antes',
      },
      {
        label: 'Aves na gaiola',
        value: countOf(overview.cage.birdCount),
        note: `Bateria ${overview.cage.battery}`,
      },
      overview.rangeStatus === 'NO_RANGE' || !range
        ? {
            label: 'Situação',
            value: 'Sem faixa definida',
            note: 'A faixa é definida no cadastro do setor',
          }
        : {
            label: 'Situação',
            value: overview.rangeStatus === 'WITHIN' ? 'Dentro da faixa' : 'Fora da faixa',
            note: `Faixa ${range}`,
            tone: overview.rangeStatus === 'WITHIN' ? 'success' : 'warning',
          },
    ];
  });

  /** Os pontos do gráfico, da pesagem mais antiga das 12 para a mais recente (FR-010). */
  protected readonly chart = computed<readonly ChartPoint[]>(() =>
    (this.overview()?.chart ?? []).map((point) => ({
      label: dayOf(point.weighedOn).slice(0, 5),
      value: point.averageWeight,
      text: `${weightOf(point.averageWeight)} em ${dayOf(point.weighedOn)}`,
    })),
  );

  protected readonly chartBand = computed<ChartBand | undefined>(() => {
    const range = this.overview()?.sector.referenceWeight;
    return range
      ? { from: range.minimum, to: range.maximum, label: `Faixa ideal ${this.range()}` }
      : undefined;
  });

  /** O nome do gráfico para o leitor de tela: de onde a curva sai e aonde chega. */
  protected readonly chartLabel = computed(() => {
    const points = this.chart();
    const code = this.overview()?.cage.code ?? '';
    if (points.length === 0) {
      return `Evolução do peso médio da gaiola ${code}`;
    }
    return `Evolução do peso médio da gaiola ${code}, de ${points[0].text} a ${points[points.length - 1].text}`;
  });

  protected readonly chartSubtitle = computed(() => {
    const count = this.chart().length;
    return count === 1 ? 'Última pesagem' : `Últimas ${count} pesagens`;
  });

  protected readonly formatWeight = (grams: number): string => weightOf(grams);

  protected readonly caption = computed(() => {
    const code = this.overview()?.cage.code;
    return code ? `Histórico de pesagens da gaiola ${code}` : 'Histórico de pesagens';
  });

  constructor() {
    // A primeira carga, e cada gravação: a tela lê de novo o acompanhamento, com as contas refeitas.
    const changes = inject(WeighingChanges).version;
    effect(() => {
      changes();
      untracked(() => void this.load());
    });
  }

  /** A consequência da exclusão, escrita no diálogo de confirmação. */
  protected consequenceOf(weighing: WeighingHistoryEntry): string {
    const code = this.overview()?.cage.code ?? '';
    return `O peso médio de ${weightOf(weighing.averageWeight)} da gaiola ${code} sairá do histórico e do gráfico.`;
  }

  protected async exclude(weighing: WeighingHistoryEntry): Promise<void> {
    const position = this.overview()?.history.findIndex((entry) => entry.id === weighing.id) ?? -1;

    this.voiding.set(true);
    const result = await this.voidWeighing.execute(this.sectorId, this.cageId, weighing.id);
    this.voiding.set(false);
    this.confirming.set(null);

    if (!result.success) {
      this.exclusionRefusal.set(result.notification);
      // Outra pessoa anulou a pesagem ou inativou a gaiola: a tela lê de novo e mostra como está.
      if (result.notification.errors.some((error) => STALE.has(error.code))) {
        await this.load();
      }
      return;
    }
    this.exclusionRefusal.set(Notification.empty());
    this.toaster.show(`Pesagem de ${dayOf(weighing.weighedOn)} excluída.`);
    await this.load();
    this.focusRowAfterRender(position);
  }

  /**
   * Depois de excluir, o foco vai para a correção da linha que tomou o lugar da excluída — ou da última, se a
   * excluída era a mais antiga. Sem linha, vai para a tabela; e, se a gaiola ficou sem pesagem, para o estado
   * vazio.
   */
  private focusRowAfterRender(position: number): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const rows = Array.from(root.querySelectorAll<HTMLElement>('tbody tr[data-weighing]'));
        const row = rows[Math.min(Math.max(position, 0), rows.length - 1)];
        const target =
          row?.querySelector<HTMLElement>('a.icon-btn') ??
          root.querySelector<HTMLElement>('.tbl-wrap') ??
          root.querySelector<HTMLElement>('[data-empty]');
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    const result = await this.getOverview.execute(this.sectorId, this.cageId);
    this.loading.set(false);
    if (!result.success) {
      const missing = result.notification.errors.some((error) => NOT_FOUND.has(error.code));
      this.missing.set(missing);
      this.refusal.set(missing ? Notification.empty() : result.notification);
      return;
    }
    this.missing.set(false);
    this.refusal.set(Notification.empty());
    this.overview.set(result.value);
  }
}
