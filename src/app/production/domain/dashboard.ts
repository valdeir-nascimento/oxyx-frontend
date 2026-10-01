import {
  Actor,
  FeedStatus,
  MortalityStatus,
  ProductionStatus,
  ReportingSector,
} from './daily-report';

/** O período do painel: hoje contra ontem, ontem contra anteontem, ou os 7 dias até hoje contra os 7 anteriores. */
export type DashboardPeriod = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS';

/** A parte do dia no relógio da granja, para a saudação. */
export type PartOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING';

/** Uma aba do painel: um setor ativo com ao menos um relatório. */
export interface DashboardSector {
  readonly id: string;
  readonly name: string;
}

/** O cabeçalho do painel e as abas, como o backend os devolve (`DashboardOverview`, feature 006). */
export interface DashboardOverview {
  /** O dia de hoje da granja, em ISO. */
  readonly today: string;
  readonly partOfDay: PartOfDay;
  readonly activeSectors: number;
  readonly completeToday: number;
  readonly sectors: readonly DashboardSector[];
}

/** O sentido bom da variação: mais ovos e mais produtividade; menos custo. */
export type GoodDirection = 'UP' | 'DOWN';

/** Um indicador do período. Sem dado, o valor fica ausente, e não zero. As contas vêm prontas do backend. */
export interface Indicator {
  readonly value?: number;
  readonly previous?: number;
  /** Em porcentagem (produção e custos) ou em pontos percentuais (produtividade); ausente sem comparação. */
  readonly change?: number;
  readonly goodDirection: GoodDirection;
  /** Os dias do período com o lançamento pendente. */
  readonly incompleteDays: number;
}

export interface Indicators {
  readonly production: Indicator;
  readonly layingRate: Indicator;
  readonly feedCost: Indicator;
  readonly costPerEgg: Indicator;
}

/** Um dia dos últimos 7. Sem relatório, os valores ficam ausentes; com a ração pendente, os custos. */
export interface DashboardDay {
  readonly date: string;
  readonly production?: number;
  readonly layingRate?: number;
  readonly feedCost?: number;
  readonly costPerEgg?: number;
}

/** O relatório de hoje do setor e a situação de cada lançamento. */
export interface TodayReport {
  readonly id: string;
  readonly productionStatus: ProductionStatus;
  readonly feedStatus: FeedStatus;
  readonly mortalityStatus: MortalityStatus;
}

/** O painel de um setor num período, como o backend o devolve (`SectorDashboard`, feature 006). */
export interface SectorDashboard {
  readonly sector: ReportingSector;
  readonly period: DashboardPeriod;
  readonly from: string;
  readonly to: string;
  /** Ausente se hoje ainda não foi aberto. */
  readonly todayReport?: TodayReport;
  readonly indicators: Indicators;
  /** Os 7 dias até hoje. */
  readonly trend: readonly DashboardDay[];
  /** A meta de produtividade do setor, em porcentagem (feature 008). */
  readonly target: number;
  /** O último dia com relatório diante da meta; ausente sem dia com relatório. */
  readonly targetStatus?: TargetStatus;
  /** A classificação dos ovos do período; ausente sem ovo. */
  readonly grades?: EggGrading;
  /** Os alertas e as pendências de hoje, na ordem em que aparecem. */
  readonly alerts: readonly DashboardAlert[];
  readonly openAlerts: number;
  /** Os 4 relatórios mais recentes, do mais novo para o mais antigo. */
  readonly latestReports: readonly LatestReport[];
}

/** Um dos relatórios mais recentes do setor, com a situação de cada lançamento. */
export interface LatestReport {
  readonly id: string;
  readonly collectionDate: string;
  /** "06:30". */
  readonly collectionTime: string;
  readonly openedBy: Actor;
  readonly collectedEggs: number;
  readonly removedBirds: number;
  readonly productionStatus: ProductionStatus;
  readonly feedStatus: FeedStatus;
  readonly mortalityStatus: MortalityStatus;
}

/** O tipo de um alerta ou de uma pendência de hoje. */
export type AlertKind =
  | 'REPORT_NOT_OPENED'
  | 'PRODUCTION_PENDING'
  | 'FEED_PENDING'
  | 'MORTALITY_PENDING'
  | 'HIGH_MORTALITY'
  | 'LOW_LAYING'
  | 'WEIGHT_OUT_OF_RANGE';

/** O tom de um alerta: pede atenção, ou só informa. */
export type AlertTone = 'WARNING' | 'INFO';

/** Para onde o alerta leva, como dados; sem campo, a abertura do relatório de hoje. */
export interface AlertTarget {
  readonly reportId?: string;
  readonly cageId?: string;
  readonly cageCode?: string;
}

/** Um alerta ou uma pendência de hoje, com os textos prontos do backend. */
export interface DashboardAlert {
  readonly kind: AlertKind;
  readonly tone: AlertTone;
  readonly title: string;
  readonly detail: string;
  readonly target: AlertTarget;
}

/** O último dia com relatório diante da meta de produtividade, com a meta incluída. */
export type TargetStatus = 'ABOVE' | 'BELOW';

/** Uma classe de ovos: `standard` ou uma das seis classes fora do padrão. */
export type EggGrade =
  'standard' | 'small' | 'jumbo' | 'dirty' | 'cracked' | 'bloodSpot' | 'abnormal';

/** Uma classe de ovos do período, com a quantidade e a porcentagem sobre os coletados. */
export interface EggGradeShare {
  readonly grade: EggGrade;
  readonly count: number;
  readonly percent: number;
}

/** A classificação dos ovos do período: os padrão e as seis classes fora do padrão, nessa ordem. */
export interface EggGrading {
  readonly collected: number;
  readonly standard: EggGradeShare;
  readonly shares: readonly EggGradeShare[];
}

/**
 * Se o relatório de hoje tem a produção, a ração e a mortalidade lançadas: a mesma regra do "completo hoje"
 * do cabeçalho (FR-004, FR-018), lida das situações que o backend devolve.
 */
export function isComplete(report: TodayReport): boolean {
  return (
    report.productionStatus === 'COMPLETE' &&
    report.feedStatus === 'COMPLETE' &&
    report.mortalityStatus === 'RECORDED'
  );
}

/** O veredito de uma variação: boa, ruim ou sem mudança. */
export type Verdict = 'good' | 'bad' | 'flat';

/**
 * Se a variação de um indicador é boa ou ruim, pelo sentido bom dele (FR-006): mais ovos e mais produtividade
 * são bons, custo maior é ruim. Sem variação, ou com variação zero, não há veredito.
 */
export function verdictOf(indicator: Indicator): Verdict {
  if (indicator.change === undefined || indicator.change === 0) {
    return 'flat';
  }
  return indicator.change > 0 === (indicator.goodDirection === 'UP') ? 'good' : 'bad';
}
