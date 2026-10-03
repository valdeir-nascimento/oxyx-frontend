import { DashboardAlert } from '../../domain/dashboard';

/** A aba do relatório de hoje onde cada pendência se resolve. */
const REPORT_TAB: Readonly<Partial<Record<DashboardAlert['kind'], string>>> = {
  PRODUCTION_PENDING: 'producao',
  FEED_PENDING: 'racao',
  MORTALITY_PENDING: 'mortalidade',
  HIGH_MORTALITY: 'mortalidade',
};

/** Os avisos de pesagem (feature 010), que se resolvem na lista de gaiolas filtrada pelas que faltam pesar. */
const WEIGHING: readonly DashboardAlert['kind'][] = ['WEIGHING_DUE', 'WEIGHING_LATE'];

/**
 * A rota de tela do atalho de um alerta (FR-017 da 006, R-007): o destino vem como dados do backend, e a rota,
 * em português, é montada aqui. A abertura do relatório, as abas dele, as gaiolas ou o peso de uma gaiola. Os
 * avisos de pesagem levam às gaiolas, com o filtro de {@link alertQueryOf}.
 */
export function alertRouteOf(sectorId: string, alert: DashboardAlert): readonly string[] {
  const sector = ['/setores', sectorId];
  const tab = REPORT_TAB[alert.kind];
  if (tab && alert.target.reportId) {
    return [...sector, 'relatorios', alert.target.reportId, tab];
  }
  if (alert.kind === 'WEIGHT_OUT_OF_RANGE' && alert.target.cageId) {
    return [...sector, 'gaiolas', alert.target.cageId, 'peso'];
  }
  if (alert.kind === 'LOW_LAYING' || WEIGHING.includes(alert.kind)) {
    return [...sector, 'gaiolas'];
  }
  return [...sector, 'relatorios', 'novo'];
}

/**
 * O filtro da tela de destino de um alerta, como parâmetros da URL: os avisos de pesagem abrem a lista de gaiolas
 * já em "Pesagem pendente" (FR-011 da 010). Os outros alertas não levam filtro.
 */
export function alertQueryOf(alert: DashboardAlert): Readonly<Record<string, string>> | null {
  return WEIGHING.includes(alert.kind) ? { pesagem: 'pendente' } : null;
}
