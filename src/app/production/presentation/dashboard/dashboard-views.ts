import { DistributionPart } from '../../../shared/presentation/ui/distribution/distribution';
import { KpiTone } from '../../../shared/presentation/ui/kpi/kpi';
import { ChartPoint, ChartReference } from '../../../shared/presentation/ui/line-chart/line-chart';
import { StatusBadgeTone } from '../../../shared/presentation/ui/status-badge/status-badge';
import { percentOf } from '../../domain/daily-report';
import {
  DashboardDay,
  EggGrade,
  EggGrading,
  Indicator,
  Indicators,
  TargetStatus,
  TodayReport,
  isComplete,
  verdictOf,
} from '../../domain/dashboard';
import { countOf, dayOf, moneyOf, signedPercentOf, signedPointsOf } from '../labels/labels';

/**
 * A montagem do painel em textos e pontos, a mesma para a aba de um setor e para a granja toda (R-011 da 009).
 * São funções puras de exibição: os números vêm prontos do backend, e nenhuma conta é feita aqui.
 */

/** Um indicador como o `ovyx-kpi` o recebe: tudo já escrito. */
export interface KpiView {
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

/** Um dia da série, de um setor ou da granja: só os valores que os indicadores e os gráficos usam. */
export type TrendDay = Pick<
  DashboardDay,
  'date' | 'production' | 'layingRate' | 'feedCost' | 'costPerEgg'
>;

/** O que os pendentes contam: dias, na aba do setor; relatórios, na granja (R-007 da 009). */
export type PendingUnit = 'DAY' | 'REPORT';

/** A unidade dos pendentes por extenso, no singular e no plural. */
const PENDING_UNIT_LABEL: Readonly<Record<PendingUnit, readonly [string, string]>> = {
  DAY: ['dia', 'dias'],
  REPORT: ['relatório', 'relatórios'],
};

/** As classes de ovos em português, como na aba Produção do relatório. */
export const GRADE_LABEL: Readonly<Record<EggGrade, string>> = {
  standard: 'Padrão',
  small: 'Pequenos',
  jumbo: 'Jumbo',
  dirty: 'Sujos',
  cracked: 'Trincados',
  bloodSpot: 'Com sangue',
  abnormal: 'Anormais',
};

/** A classificação como o `ovyx-distribution` a recebe. */
export interface GradingView {
  readonly mainPercent: number;
  readonly mainText: string;
  readonly mainNote: string;
  readonly parts: readonly DistributionPart[];
}

/** Os pendentes de um indicador, concordando em número: "1 dia com a produção pendente", "2 relatórios …". */
export function pendingNote(count: number, unit: PendingUnit, what: string): string | undefined {
  if (count === 0) {
    return undefined;
  }
  const [one, many] = PENDING_UNIT_LABEL[unit];
  return `${count} ${count === 1 ? one : many} ${what}`;
}

/** Se o valor subiu ou desceu, para a seta do indicador. */
export function directionOf(indicator: Indicator): 'up' | 'down' | undefined {
  if (indicator.change === undefined || indicator.change === 0) {
    return undefined;
  }
  return indicator.change > 0 ? 'up' : 'down';
}

/** Os quatro indicadores do painel, com a variação, a tendência dos 7 dias e os pendentes. */
export function kpisOf(
  indicators: Indicators,
  trend: readonly TrendDay[],
  unit: PendingUnit,
): KpiView[] {
  const { production, layingRate, feedCost, costPerEgg } = indicators;
  const series = (field: 'production' | 'layingRate' | 'feedCost' | 'costPerEgg') =>
    trend.map((day) => day[field]);
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
      note: pendingNote(production.incompleteDays, unit, 'com a produção pendente'),
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
      note: pendingNote(layingRate.incompleteDays, unit, 'com a produção pendente'),
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
      note: pendingNote(feedCost.incompleteDays, unit, 'sem ração completa'),
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
      note: pendingNote(costPerEgg.incompleteDays, unit, 'sem ração completa'),
    },
  ];
}

/** Os pontos de um valor da série: só os dias que o têm, e o dia sem valor fica sem ponto (FR-013 da 006). */
export function pointsOf(
  trend: readonly TrendDay[],
  field: 'layingRate' | 'costPerEgg',
  write: (value: number) => string,
): readonly ChartPoint[] {
  return trend.flatMap((day) => {
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

/** A linha da meta no gráfico da produtividade, com a casa decimal só quando houver. */
export function targetReferenceOf(target: number | undefined): ChartReference | undefined {
  return target === undefined ? undefined : { value: target, label: `Meta ${countOf(target)}%` };
}

/** O selo do último dia diante da meta; sem dia com relatório, nenhum. */
export function targetBadgeOf(
  status: TargetStatus | undefined,
): { label: string; tone: StatusBadgeTone } | null {
  if (!status) {
    return null;
  }
  return status === 'ABOVE'
    ? { label: 'Acima da meta', tone: 'success' }
    : { label: 'Abaixo da meta', tone: 'warning' };
}

/**
 * A situação dos lançamentos de um relatório: completo, ou o primeiro que falta, na ordem das abas do relatório. Sem
 * relatório, "Não aberto" (a comparação da granja, feature 009).
 */
export function reportSituationOf(report: TodayReport | undefined): { label: string; tone: StatusBadgeTone } {
  if (!report) {
    return { label: 'Não aberto', tone: 'neutral' };
  }
  if (isComplete(report)) {
    return { label: 'Completo', tone: 'success' };
  }
  if (report.productionStatus === 'PENDING') {
    return { label: 'Produção pendente', tone: 'warning' };
  }
  return report.feedStatus === 'PENDING'
    ? { label: 'Ração pendente', tone: 'warning' }
    : { label: 'Mortalidade pendente', tone: 'warning' };
}

/** A classificação dos ovos do período; sem ovo, nenhuma. */
export function gradingOf(grades: EggGrading | undefined): GradingView | null {
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
}
