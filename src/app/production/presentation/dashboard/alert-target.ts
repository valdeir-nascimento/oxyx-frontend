import { DashboardAlert } from '../../domain/dashboard';

/** A aba do relatório de hoje onde cada pendência se resolve. */
const REPORT_TAB: Readonly<Partial<Record<DashboardAlert['kind'], string>>> = {
  PRODUCTION_PENDING: 'producao',
  FEED_PENDING: 'racao',
  MORTALITY_PENDING: 'mortalidade',
  HIGH_MORTALITY: 'mortalidade',
};

/**
 * A rota de tela do atalho de um alerta (FR-017 da 006, R-007): o destino vem como dados do backend, e a rota,
 * em português, é montada aqui. A abertura do relatório, as abas dele, as gaiolas ou o peso de uma gaiola.
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
  if (alert.kind === 'LOW_LAYING') {
    return [...sector, 'gaiolas'];
  }
  return [...sector, 'relatorios', 'novo'];
}
