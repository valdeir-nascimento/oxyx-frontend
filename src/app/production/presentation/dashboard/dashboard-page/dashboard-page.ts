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
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VIEWER } from '../../../../shared/application/viewer';
import { Notification } from '../../../../shared/domain/notification';
import {
  Distribution,
  DistributionPart,
} from '../../../../shared/presentation/ui/distribution/distribution';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { DataTable } from '../../../../shared/presentation/ui/data-table/data-table';
import { EmptyState } from '../../../../shared/presentation/ui/empty-state/empty-state';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { Icon } from '../../../../shared/presentation/ui/icon/icon';
import { IconName } from '../../../../shared/presentation/ui/icon/icons';
import { Kpi, KpiTone } from '../../../../shared/presentation/ui/kpi/kpi';
import {
  ChartPoint,
  ChartReference,
  LineChart,
} from '../../../../shared/presentation/ui/line-chart/line-chart';
import { PageHeader } from '../../../../shared/presentation/ui/page-header/page-header';
import {
  SegmentOption,
  SegmentedControl,
} from '../../../../shared/presentation/ui/segmented-control/segmented-control';
import {
  StatusBadge,
  StatusBadgeTone,
} from '../../../../shared/presentation/ui/status-badge/status-badge';
import { TabLink, TabNav } from '../../../../shared/presentation/ui/tab-nav/tab-nav';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { ExportSectorDashboardUseCase } from '../../../application/dashboard/export-sector-dashboard.usecase';
import { GetDashboardOverviewUseCase } from '../../../application/dashboard/get-dashboard-overview.usecase';
import { GetSectorDashboardUseCase } from '../../../application/dashboard/get-sector-dashboard.usecase';
import { percentOf } from '../../../domain/daily-report';
import {
  DashboardDay,
  DashboardOverview,
  AlertKind,
  DashboardPeriod,
  EggGrade,
  Indicator,
  LatestReport,
  isComplete,
  verdictOf,
  PartOfDay,
  SectorDashboard,
} from '../../../domain/dashboard';
import {
  countOf,
  dayOf,
  dayWithWeekdayOf,
  moneyOf,
  signedPercentOf,
  signedPointsOf,
} from '../../labels/labels';
import { alertRouteOf } from '../alert-target';

/** O período na URL da tela, em português (R-002 da 006). */
const PERIOD_OF_ROUTE: Readonly<Record<string, DashboardPeriod>> = {
  hoje: 'TODAY',
  ontem: 'YESTERDAY',
  '7-dias': 'LAST_7_DAYS',
};

const ROUTE_OF_PERIOD: Readonly<Record<DashboardPeriod, string>> = {
  TODAY: 'hoje',
  YESTERDAY: 'ontem',
  LAST_7_DAYS: '7-dias',
};

const COMPARISON: Readonly<Record<DashboardPeriod, string>> = {
  TODAY: 'vs ontem',
  YESTERDAY: 'vs anteontem',
  LAST_7_DAYS: 'vs semana anterior',
};

/** O período no subtítulo da classificação. */
const PERIOD_LABEL: Readonly<Record<DashboardPeriod, string>> = {
  TODAY: 'Hoje',
  YESTERDAY: 'Ontem',
  LAST_7_DAYS: 'Últimos 7 dias',
};

/** As classes de ovos em português, como na aba Produção do relatório. */
const GRADE_LABEL: Readonly<Record<EggGrade, string>> = {
  standard: 'Padrão',
  small: 'Pequenos',
  jumbo: 'Jumbo',
  dirty: 'Sujos',
  cracked: 'Trincados',
  bloodSpot: 'Com sangue',
  abnormal: 'Anormais',
};

/** O ícone de cada alerta, como os do protótipo. */
const ALERT_ICON: Readonly<Record<AlertKind, IconName>> = {
  REPORT_NOT_OPENED: 'report',
  PRODUCTION_PENDING: 'egg',
  FEED_PENDING: 'grain',
  MORTALITY_PENDING: 'pulse',
  HIGH_MORTALITY: 'alert',
  LOW_LAYING: 'down',
  WEIGHT_OUT_OF_RANGE: 'scale',
};

const GREETING: Readonly<Record<PartOfDay, string>> = {
  MORNING: 'Bom dia',
  AFTERNOON: 'Boa tarde',
  EVENING: 'Boa noite',
};

const PERIODS: readonly SegmentOption[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: '7-dias', label: '7 dias' },
];

/** Um indicador como o `ovyx-kpi` o recebe: tudo já escrito. */
interface KpiView {
  readonly label: string;
  readonly icon: 'egg' | 'percent' | 'grain' | 'coin';
  readonly highlight: boolean;
  readonly value?: string;
  readonly unit?: string;
  readonly change?: string;
  readonly tone: KpiTone;
  readonly direction?: 'up' | 'down';
  readonly trend: readonly (number | undefined)[];
  readonly trendLabel: string;
  readonly note?: string;
}

/** A situação dos lançamentos de um relatório: completo, ou o primeiro que falta. */
function situationOf(report: LatestReport): { label: string; tone: StatusBadgeTone } {
  if (isComplete(report)) {
    return { label: 'Completo', tone: 'success' };
  }
  // Pendente: o rótulo é o do primeiro lançamento que falta, na ordem das abas do relatório.
  if (report.productionStatus === 'PENDING') {
    return { label: 'Produção pendente', tone: 'warning' };
  }
  return report.feedStatus === 'PENDING'
    ? { label: 'Ração pendente', tone: 'warning' }
    : { label: 'Mortalidade pendente', tone: 'warning' };
}

/** O dia de hoje por extenso, sem `Date` local: "Quinta-feira, 24 de setembro de 2026". */
function longDayOf(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const text = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Se o valor subiu ou desceu, para a seta do indicador. */
function directionOf(indicator: Indicator): 'up' | 'down' | undefined {
  if (indicator.change === undefined || indicator.change === 0) {
    return undefined;
  }
  return indicator.change > 0 ? 'up' : 'down';
}

function daysNote(days: number, what: string): string | undefined {
  if (days === 0) {
    return undefined;
  }
  return `${days} ${days === 1 ? 'dia' : 'dias'} ${what}`;
}

/**
 * O painel do Início (feature 006; FR-001 a FR-009): a saudação, os setores com o relatório de hoje completo,
 * as abas dos setores, o período e os quatro indicadores com a variação e a tendência dos últimos 7 dias.
 *
 * O setor e o período ficam na URL (`?setor=…&periodo=hoje|ontem|7-dias`), para o painel voltar ao mesmo
 * lugar depois de um atalho. A tela não calcula nada: as contas, as variações e o sentido bom vêm do backend.
 */
@Component({
  selector: 'ovyx-dashboard-page',
  imports: [
    Button,
    DataTable,
    Distribution,
    EmptyState,
    ErrorSummary,
    Icon,
    Kpi,
    LineChart,
    PageHeader,
    RouterLink,
    SegmentedControl,
    StatusBadge,
    TabNav,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly getOverview = inject(GetDashboardOverviewUseCase);
  private readonly getDashboard = inject(GetSectorDashboardUseCase);
  private readonly exportDashboard = inject(ExportSectorDashboardUseCase);
  private readonly toaster = inject(Toaster);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly viewer = inject(VIEWER);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly periods = PERIODS;
  protected readonly overview = signal<DashboardOverview | null>(null);
  protected readonly dashboard = signal<SectorDashboard | null>(null);
  /** Se a planilha do painel está sendo gerada (007): o botão fica desabilitado e diz "Gerando…". */
  protected readonly exporting = signal(false);
  protected readonly refusal = signal(Notification.empty());

  /** O número do último pedido do painel: só a resposta dele entra na tela. */
  private request = 0;

  protected readonly greeting = computed(() => {
    const overview = this.overview();
    const greeting = overview ? GREETING[overview.partOfDay] : 'Olá';
    const name = this.viewer.firstName();
    return name ? `${greeting}, ${name}` : greeting;
  });

  protected readonly subtitle = computed(() => {
    const overview = this.overview();
    if (!overview) {
      return undefined;
    }
    const sectors = overview.activeSectors === 1 ? 'setor' : 'setores';
    return `${longDayOf(overview.today)}. ${overview.completeToday} de ${overview.activeSectors} ${sectors} com o relatório do dia completo.`;
  });

  /** O setor e o período da URL, já conferidos contra as abas. */
  private readonly chosen = computed(() => {
    const overview = this.overview();
    if (!overview || overview.sectors.length === 0) {
      return null;
    }
    const params = this.params();
    const sectorId = params.get('setor');
    const sector =
      overview.sectors.find((candidate) => candidate.id === sectorId) ?? overview.sectors[0];
    const period = PERIOD_OF_ROUTE[params.get('periodo') ?? ''] ?? 'TODAY';
    return { sector, period };
  });

  protected readonly periodRoute = computed(
    () => ROUTE_OF_PERIOD[this.chosen()?.period ?? 'TODAY'],
  );

  protected readonly tabs = computed<readonly TabLink[]>(() =>
    (this.overview()?.sectors ?? []).map((sector) => ({
      label: sector.name,
      link: ['/'],
      queryParams: { setor: sector.id, periodo: this.periodRoute() },
    })),
  );

  protected readonly kpis = computed<readonly KpiView[]>(() => {
    const dashboard = this.dashboard();
    if (!dashboard) {
      return [];
    }
    const { production, layingRate, feedCost, costPerEgg } = dashboard.indicators;
    const series = (field: keyof Omit<DashboardDay, 'date'>) =>
      dashboard.trend.map((day) => day[field]);
    return [
      {
        label: 'Produção',
        icon: 'egg',
        highlight: true,
        value: production.value === undefined ? undefined : countOf(production.value),
        unit: 'ovos',
        change: production.change === undefined ? undefined : signedPercentOf(production.change),
        tone: verdictOf(production),
        direction: directionOf(production),
        trend: series('production'),
        trendLabel: 'Produção dos últimos 7 dias',
        note: daysNote(production.incompleteDays, 'com a produção pendente'),
      },
      {
        label: 'Produtividade',
        icon: 'percent',
        highlight: false,
        value: layingRate.value === undefined ? undefined : percentOf(layingRate.value, 2),
        change: layingRate.change === undefined ? undefined : signedPointsOf(layingRate.change),
        tone: verdictOf(layingRate),
        direction: directionOf(layingRate),
        trend: series('layingRate'),
        trendLabel: 'Produtividade dos últimos 7 dias',
        note: daysNote(layingRate.incompleteDays, 'com a produção pendente'),
      },
      {
        label: 'Custo de ração',
        icon: 'grain',
        highlight: false,
        value: feedCost.value === undefined ? undefined : moneyOf(feedCost.value),
        change: feedCost.change === undefined ? undefined : signedPercentOf(feedCost.change),
        tone: verdictOf(feedCost),
        direction: directionOf(feedCost),
        trend: series('feedCost'),
        trendLabel: 'Custo de ração dos últimos 7 dias',
        note: daysNote(feedCost.incompleteDays, 'sem ração completa'),
      },
      {
        label: 'Custo por ovo',
        icon: 'coin',
        highlight: false,
        value: costPerEgg.value === undefined ? undefined : moneyOf(costPerEgg.value, 3),
        change: costPerEgg.change === undefined ? undefined : signedPercentOf(costPerEgg.change),
        tone: verdictOf(costPerEgg),
        direction: directionOf(costPerEgg),
        trend: series('costPerEgg'),
        trendLabel: 'Custo por ovo dos últimos 7 dias',
        note: daysNote(costPerEgg.incompleteDays, 'sem ração completa'),
      },
    ];
  });

  /** A comparação do painel mostrado, e não da URL que ainda carrega. */
  protected readonly comparison = computed(() => COMPARISON[this.dashboard()?.period ?? 'TODAY']);

  // ---------------------------------------------------------------- gráficos e classificação (US2)

  /** Os pontos de um valor da série: só os dias que o têm, e o dia sem valor fica sem ponto (FR-013). */
  private pointsOf(
    field: 'layingRate' | 'costPerEgg',
    write: (value: number) => string,
  ): readonly ChartPoint[] {
    return (this.dashboard()?.trend ?? []).flatMap((day) => {
      const value = day[field];
      return value === undefined
        ? []
        : [
            {
              label: dayOf(day.date).slice(0, 5),
              value,
              text: `${write(value)} em ${dayOf(day.date)}`,
            },
          ];
    });
  }

  protected readonly productivityPoints = computed(() =>
    this.pointsOf('layingRate', (value) => percentOf(value, 2)),
  );

  protected readonly costPoints = computed(() =>
    this.pointsOf('costPerEgg', (value) => moneyOf(value, 3)),
  );

  protected readonly target = computed<ChartReference | undefined>(() => {
    const target = this.dashboard()?.target;
    return target === undefined ? undefined : { value: target, label: `Meta ${countOf(target)}%` };
  });

  /** O nome do gráfico para o leitor de tela, com a meta que vem do backend. */
  protected readonly productivityLabel = computed(() => {
    const dashboard = this.dashboard();
    return dashboard
      ? `Produtividade diária de ${dashboard.sector.name}, com a meta de ${countOf(dashboard.target)}%`
      : '';
  });

  protected readonly targetBadge = computed<{ label: string; tone: StatusBadgeTone } | null>(() => {
    const status = this.dashboard()?.targetStatus;
    if (!status) {
      return null;
    }
    return status === 'ABOVE'
      ? { label: 'Acima da meta', tone: 'success' }
      : { label: 'Abaixo da meta', tone: 'warning' };
  });

  protected readonly formatRate = (value: number): string => percentOf(value, 2);

  // ---------------------------------------------------------------- alertas e pendências (US3)

  protected readonly alertItems = computed(() => {
    const sectorId = this.sectorId();
    return (this.dashboard()?.alerts ?? []).map((alert) => ({
      ...alert,
      toneClass: alert.tone === 'WARNING' ? 'warning' : 'info',
      icon: ALERT_ICON[alert.kind],
      route: sectorId ? alertRouteOf(sectorId, alert) : [],
    }));
  });

  protected readonly openAlertsLabel = computed(() => {
    const open = this.dashboard()?.openAlerts ?? 0;
    return open === 1 ? '1 aberto' : `${countOf(open)} abertos`;
  });

  // ---------------------------------------------------------------- últimos relatórios e convite (US4)

  protected readonly dayWithWeekdayOf = dayWithWeekdayOf;
  protected readonly countOf = countOf;

  /** A granja sem setor com relatório: o painel convida a começar, sem abas nem indicadores (FR-021). */
  protected readonly empty = computed(() => this.overview()?.sectors.length === 0);

  protected readonly latestReports = computed(() =>
    (this.dashboard()?.latestReports ?? []).map((report) => ({
      ...report,
      situation: situationOf(report),
    })),
  );

  /** Sem alerta e com o relatório de hoje completo, a lista diz isso, em vez de ficar vazia (FR-018). */
  protected readonly allClear = computed(() => {
    const dashboard = this.dashboard();
    const report = dashboard?.todayReport;
    return (dashboard?.alerts ?? []).length === 0 && report !== undefined && isComplete(report);
  });
  protected readonly formatCostPerEgg = (value: number): string => moneyOf(value, 3);

  protected readonly gradingSubtitle = computed(() => {
    const dashboard = this.dashboard();
    return dashboard ? `${PERIOD_LABEL[dashboard.period]} · ${dashboard.sector.name}` : '';
  });

  protected readonly grading = computed(() => {
    const grades = this.dashboard()?.grades;
    if (!grades) {
      return null;
    }
    return {
      mainPercent: grades.standard.percent,
      mainText: percentOf(grades.standard.percent, 1),
      mainNote: `padrão · ${countOf(grades.standard.count)} de ${countOf(grades.collected)} ovos`,
      parts: grades.shares.map<DistributionPart>((share) => ({
        label: GRADE_LABEL[share.grade],
        count: share.count,
        countText: countOf(share.count),
        percentText: percentOf(share.percent, 1),
      })),
    };
  });

  /**
   * O setor do painel mostrado, para os atalhos. É o da resposta, e não o da URL: enquanto o painel de outra
   * aba carrega, os atalhos continuam levando ao setor dos dados que estão na tela.
   */
  protected readonly sectorId = computed(() => this.dashboard()?.sector.id);

  /** Sem o relatório de hoje, o painel oferece abri-lo (FR-020). */
  protected readonly todayMissing = computed(() => {
    const dashboard = this.dashboard();
    return dashboard !== null && dashboard.todayReport === undefined;
  });

  constructor() {
    void this.loadOverview();
    // A URL manda: sem setor ou período válidos, ela é escrita de novo; com eles, o painel é pedido.
    effect(() => {
      const chosen = this.chosen();
      if (!chosen) {
        return;
      }
      const params = this.params();
      const periodRoute = ROUTE_OF_PERIOD[chosen.period];
      if (params.get('setor') !== chosen.sector.id || params.get('periodo') !== periodRoute) {
        untracked(
          () =>
            void this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { setor: chosen.sector.id, periodo: periodRoute },
              replaceUrl: true,
            }),
        );
        return;
      }
      untracked(() => void this.loadDashboard(chosen.sector.id, chosen.period));
    });
  }

  protected choosePeriod(periodRoute: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { setor: this.chosen()?.sector.id, periodo: periodRoute },
    });
  }

  private async loadOverview(): Promise<void> {
    const result = await this.getOverview.execute();
    if (!result.success) {
      this.refusal.set(result.notification);
      return;
    }
    this.overview.set(result.value);
  }

  private async loadDashboard(sectorId: string, period: DashboardPeriod): Promise<void> {
    const request = ++this.request;
    const result = await this.getDashboard.execute(sectorId, period);
    if (request !== this.request) {
      return;
    }
    if (!result.success) {
      this.dashboard.set(null);
      this.refusal.set(result.notification);
      return;
    }
    this.refusal.set(Notification.empty());
    this.dashboard.set(result.value);
  }

  /**
   * Exporta o painel mostrado (US2 da 007): o setor e o período de `dashboard()`, e não os da URL que ainda
   * carrega, como os atalhos. Enquanto gera, não aceita outro pedido; o resultado vai para o aviso.
   */
  protected async export(): Promise<void> {
    const shown = this.dashboard();
    if (!shown || this.exporting()) {
      return;
    }
    this.exporting.set(true);
    const result = await this.exportDashboard.execute(shown.sector.id, shown.period);
    this.exporting.set(false);
    this.giveFocusBackToExport();
    if (result.success) {
      this.toaster.show(`Planilha gerada (${result.value}).`);
      return;
    }
    const reasons = result.notification.errors.map((error) => error.message).join(' ');
    this.toaster.show(`Não foi possível gerar a planilha: ${reasons}`, 'danger');
  }

  /**
   * O botão desabilitado durante a geração perde o foco, que cai no corpo da página (QA 1 da 007). Quando o botão
   * volta, o foco volta para ele, se não foi para outro lugar.
   */
  private giveFocusBackToExport(): void {
    afterNextRender(
      () => {
        const focused = document.activeElement;
        if (!focused || focused === document.body) {
          this.host.nativeElement.querySelector<HTMLElement>('[data-export] button')?.focus();
        }
      },
      { injector: this.injector },
    );
  }
}
