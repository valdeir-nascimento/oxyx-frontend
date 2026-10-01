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
import { Distribution } from '../../../../shared/presentation/ui/distribution/distribution';
import { Button } from '../../../../shared/presentation/ui/button/button';
import { DataTable } from '../../../../shared/presentation/ui/data-table/data-table';
import { EmptyState } from '../../../../shared/presentation/ui/empty-state/empty-state';
import { ErrorSummary } from '../../../../shared/presentation/ui/error-summary/error-summary';
import { Icon } from '../../../../shared/presentation/ui/icon/icon';
import { IconName } from '../../../../shared/presentation/ui/icon/icons';
import { Kpi } from '../../../../shared/presentation/ui/kpi/kpi';
import { LineChart } from '../../../../shared/presentation/ui/line-chart/line-chart';
import { PageHeader } from '../../../../shared/presentation/ui/page-header/page-header';
import {
  SegmentOption,
  SegmentedControl,
} from '../../../../shared/presentation/ui/segmented-control/segmented-control';
import { StatusBadge } from '../../../../shared/presentation/ui/status-badge/status-badge';
import { TabLink, TabNav } from '../../../../shared/presentation/ui/tab-nav/tab-nav';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { ExportFarmDashboardUseCase } from '../../../application/dashboard/export-farm-dashboard.usecase';
import { ExportSectorDashboardUseCase } from '../../../application/dashboard/export-sector-dashboard.usecase';
import { GetDashboardOverviewUseCase } from '../../../application/dashboard/get-dashboard-overview.usecase';
import { GetFarmDashboardUseCase } from '../../../application/dashboard/get-farm-dashboard.usecase';
import { GetSectorDashboardUseCase } from '../../../application/dashboard/get-sector-dashboard.usecase';
import { percentOf } from '../../../domain/daily-report';
import {
  DashboardOverview,
  AlertKind,
  DashboardPeriod,
  DashboardSector,
  FarmDashboard,
  isComplete,
  PartOfDay,
  SectorDashboard,
} from '../../../domain/dashboard';
import { countOf, dayWithWeekdayOf, moneyOf } from '../../labels/labels';
import { alertRouteOf } from '../alert-target';
import {
  KpiView,
  gradingOf,
  kpisOf,
  pointsOf,
  reportSituationOf,
  targetBadgeOf,
  targetReferenceOf,
} from '../dashboard-views';
import { FarmPanel } from '../farm-panel/farm-panel';

/** A aba da granja toda na URL (`?setor=granja`, R-002 da 009). */
const FARM_TAB = 'granja';

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
    FarmPanel,
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
  private readonly getFarm = inject(GetFarmDashboardUseCase);
  private readonly exportFarm = inject(ExportFarmDashboardUseCase);
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
  /** O painel da granja toda, quando é a aba mostrada (feature 009); o do setor fica nulo. */
  protected readonly farm = signal<FarmDashboard | null>(null);
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

  /** Com duas ou mais abas de setor, a granja toda vem antes delas (FR-001 da 009, R-008). */
  private readonly hasFarm = computed(() => (this.overview()?.sectors.length ?? 0) >= 2);

  /**
   * A aba e o período da URL, já conferidos contra as abas. Com a granja toda, ela é o padrão: sem setor, ou com um
   * que não é aba (FR-002 da 009). Sem ela, o primeiro setor.
   */
  private readonly chosen = computed<{
    readonly tab: string;
    readonly sector: DashboardSector | null;
    readonly period: DashboardPeriod;
  } | null>(() => {
    const overview = this.overview();
    if (!overview || overview.sectors.length === 0) {
      return null;
    }
    const params = this.params();
    const period = PERIOD_OF_ROUTE[params.get('periodo') ?? ''] ?? 'TODAY';
    const sector = overview.sectors.find((candidate) => candidate.id === params.get('setor'));
    if (sector) {
      return { tab: sector.id, sector, period };
    }
    if (this.hasFarm()) {
      return { tab: FARM_TAB, sector: null, period };
    }
    return { tab: overview.sectors[0].id, sector: overview.sectors[0], period };
  });

  protected readonly periodRoute = computed(
    () => ROUTE_OF_PERIOD[this.chosen()?.period ?? 'TODAY'],
  );

  protected readonly tabs = computed<readonly TabLink[]>(() => {
    const sectors = (this.overview()?.sectors ?? []).map((sector) => ({
      label: sector.name,
      link: ['/'],
      queryParams: { setor: sector.id, periodo: this.periodRoute() },
    }));
    if (!this.hasFarm()) {
      return sectors;
    }
    return [
      { label: 'Granja toda', link: ['/'], queryParams: { setor: FARM_TAB, periodo: this.periodRoute() } },
      ...sectors,
    ];
  });

  protected readonly kpis = computed<readonly KpiView[]>(() => {
    const dashboard = this.dashboard();
    return dashboard ? kpisOf(dashboard.indicators, dashboard.trend, 'DAY') : [];
  });

  /** A comparação do painel mostrado, e não da URL que ainda carrega. */
  protected readonly comparison = computed(
    () => COMPARISON[this.dashboard()?.period ?? this.farm()?.period ?? 'TODAY'],
  );

  // ---------------------------------------------------------------- gráficos e classificação (US2)

  protected readonly productivityPoints = computed(() =>
    pointsOf(this.dashboard()?.trend ?? [], 'layingRate', (value) => percentOf(value, 2)),
  );

  protected readonly costPoints = computed(() =>
    pointsOf(this.dashboard()?.trend ?? [], 'costPerEgg', (value) => moneyOf(value, 3)),
  );

  protected readonly target = computed(() => targetReferenceOf(this.dashboard()?.target));

  /** O nome do gráfico para o leitor de tela, com a meta que vem do backend. */
  protected readonly productivityLabel = computed(() => {
    const dashboard = this.dashboard();
    return dashboard
      ? `Produtividade diária de ${dashboard.sector.name}, com a meta de ${countOf(dashboard.target)}%`
      : '';
  });

  protected readonly targetBadge = computed(() => targetBadgeOf(this.dashboard()?.targetStatus));

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
      situation: reportSituationOf(report),
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

  protected readonly grading = computed(() => gradingOf(this.dashboard()?.grades));

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
      if (params.get('setor') !== chosen.tab || params.get('periodo') !== periodRoute) {
        untracked(
          () =>
            void this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { setor: chosen.tab, periodo: periodRoute },
              replaceUrl: true,
            }),
        );
        return;
      }
      const sector = chosen.sector;
      untracked(() =>
        sector === null
          ? void this.loadFarm(chosen.period)
          : void this.loadDashboard(sector.id, chosen.period),
      );
    });
  }

  protected choosePeriod(periodRoute: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { setor: this.chosen()?.tab, periodo: periodRoute },
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
      this.showRefusal(result.notification);
      return;
    }
    this.refusal.set(Notification.empty());
    this.farm.set(null);
    this.dashboard.set(result.value);
  }

  /** O painel da granja toda (feature 009), com o mesmo contador de pedidos das abas dos setores. */
  private async loadFarm(period: DashboardPeriod): Promise<void> {
    const request = ++this.request;
    const result = await this.getFarm.execute(period);
    if (request !== this.request) {
      return;
    }
    if (!result.success) {
      this.showRefusal(result.notification);
      return;
    }
    this.refusal.set(Notification.empty());
    this.dashboard.set(null);
    this.farm.set(result.value);
  }

  /**
   * A recusa no lugar do painel: os dois somem, o do setor e o da granja, para a aba nova não mostrar nem exportar o
   * painel da aba anterior (revisão 1 da 009).
   */
  private showRefusal(notification: Notification): void {
    this.dashboard.set(null);
    this.farm.set(null);
    this.refusal.set(notification);
  }

  /**
   * Exporta o painel mostrado (US2 da 007): o setor e o período de `dashboard()`, e não os da URL que ainda
   * carrega, como os atalhos. Enquanto gera, não aceita outro pedido; o resultado vai para o aviso.
   */
  protected async export(): Promise<void> {
    const shown = this.dashboard();
    const farm = this.farm();
    if ((!shown && !farm) || this.exporting()) {
      return;
    }
    this.exporting.set(true);
    // O painel mostrado, e não o da URL que ainda carrega: o do setor, ou a granja toda (US4 da 009).
    const result = shown
      ? await this.exportDashboard.execute(shown.sector.id, shown.period)
      : await this.exportFarm.execute(farm!.period);
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
