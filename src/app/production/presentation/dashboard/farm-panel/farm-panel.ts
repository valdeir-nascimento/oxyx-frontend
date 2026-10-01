import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataTable } from '../../../../shared/presentation/ui/data-table/data-table';
import { Distribution } from '../../../../shared/presentation/ui/distribution/distribution';
import { Kpi } from '../../../../shared/presentation/ui/kpi/kpi';
import { LineChart } from '../../../../shared/presentation/ui/line-chart/line-chart';
import { StatusBadge } from '../../../../shared/presentation/ui/status-badge/status-badge';
import { percentOf } from '../../../domain/daily-report';
import { FarmDashboard } from '../../../domain/dashboard';
import { countOf, moneyOf } from '../../labels/labels';
import {
  KpiView,
  gradingOf,
  kpisOf,
  pointsOf,
  reportSituationOf,
  targetBadgeOf,
  targetReferenceOf,
} from '../dashboard-views';

/**
 * O painel da granja toda (feature 009): os setores ativos somados, com os indicadores da aba de um setor. O
 * componente só desenha: os números vêm prontos do backend, e a montagem é a do `dashboard-views`, a mesma da aba
 * do setor, com os pendentes contados em relatórios.
 */
@Component({
  selector: 'ovyx-farm-panel',
  imports: [DataTable, Distribution, Kpi, LineChart, RouterLink, StatusBadge],
  templateUrl: './farm-panel.html',
  styleUrl: './farm-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmPanel {
  readonly farm = input.required<FarmDashboard>();
  /** A comparação do período, como a aba do setor a escreve: "vs ontem". */
  readonly comparison = input.required<string>();
  /** O período na URL, para os links de cada setor. */
  readonly periodRoute = input.required<string>();

  protected readonly kpis = computed<readonly KpiView[]>(() =>
    kpisOf(this.farm().indicators, this.farm().trend, 'REPORT'),
  );

  // ---------------------------------------------------------------- gráficos e classificação (US3)

  protected readonly productivityPoints = computed(() =>
    pointsOf(this.farm().trend, 'layingRate', (value) => percentOf(value, 2)),
  );

  protected readonly costPoints = computed(() =>
    pointsOf(this.farm().trend, 'costPerEgg', (value) => moneyOf(value, 3)),
  );

  /** A linha da meta da granja, ponderada pelas aves dos relatórios dos 7 dias (FR-015). */
  protected readonly target = computed(() => targetReferenceOf(this.farm().target));

  protected readonly productivityLabel = computed(() => {
    const target = this.farm().target;
    return target === undefined
      ? 'Produtividade diária da granja toda'
      : `Produtividade diária da granja toda, com a meta de ${countOf(target)}%`;
  });

  protected readonly targetBadge = computed(() => targetBadgeOf(this.farm().targetStatus));

  protected readonly grading = computed(() => gradingOf(this.farm().grades));

  protected readonly formatRate = (value: number): string => percentOf(value, 2);
  protected readonly formatCostPerEgg = (value: number): string => moneyOf(value, 3);

  /** "2 de 3 setores com relatório": o setor sem relatório não conta como zero (FR-008). */
  protected readonly reporting = computed(() => {
    const { reportingSectors, activeSectors } = this.farm();
    const sectors = activeSectors === 1 ? 'setor' : 'setores';
    return `${countOf(reportingSectors)} de ${countOf(activeSectors)} ${sectors} com relatório`;
  });

  /**
   * A comparação dos setores, já escrita: o setor sem relatório no período fica com "—", e não zero (FR-013); a
   * situação diante da meta é a do período, e os alertas são os da aba do setor (US2).
   */
  protected readonly rows = computed(() =>
    this.farm().sectors.map((row) => ({
      id: row.sector.id,
      name: row.sector.name,
      production: row.production === undefined ? undefined : countOf(row.production),
      layingRate: row.layingRate === undefined ? undefined : percentOf(row.layingRate, 2),
      target: `${countOf(row.target)}%`,
      status: targetBadgeOf(row.targetStatus),
      costPerEgg: row.costPerEgg === undefined ? undefined : moneyOf(row.costPerEgg, 3),
      today: reportSituationOf(row.todayReport),
      openAlerts: countOf(row.openAlerts),
    })),
  );
}
