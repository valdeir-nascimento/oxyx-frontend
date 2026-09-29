import { DashboardAlert } from '../../domain/dashboard';
import { alertRouteOf } from './alert-target';

/**
 * O atalho de cada alerta leva à tela onde ele se resolve (FR-017 da 006, R-007): o destino vem como dados
 * do backend, e a rota de tela, em português, é montada aqui.
 */
describe('alertRouteOf', () => {
  const sectorId = '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11';
  const reportId = '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55';
  const cageId = '9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44';

  function alert(kind: DashboardAlert['kind'], target: DashboardAlert['target']): DashboardAlert {
    return { kind, tone: 'WARNING', title: 'Título', detail: 'Detalhe', target };
  }

  it('leads the report not opened to the opening of the report of the sector', () => {
    expect(alertRouteOf(sectorId, alert('REPORT_NOT_OPENED', {}))).toEqual([
      '/setores',
      sectorId,
      'relatorios',
      'novo',
    ]);
  });

  it.each([
    ['PRODUCTION_PENDING', 'producao'],
    ['FEED_PENDING', 'racao'],
    ['MORTALITY_PENDING', 'mortalidade'],
    ['HIGH_MORTALITY', 'mortalidade'],
  ] as const)('leads %s to the tab %s of the report of today', (kind, tab) => {
    expect(alertRouteOf(sectorId, alert(kind, { reportId, cageId }))).toEqual([
      '/setores',
      sectorId,
      'relatorios',
      reportId,
      tab,
    ]);
  });

  it('leads the low laying to the cages of the sector', () => {
    expect(alertRouteOf(sectorId, alert('LOW_LAYING', { cageId, cageCode: 'C-03' }))).toEqual([
      '/setores',
      sectorId,
      'gaiolas',
    ]);
  });

  it('leads the weighing out of the range to the weight of the cage', () => {
    expect(
      alertRouteOf(sectorId, alert('WEIGHT_OUT_OF_RANGE', { cageId, cageCode: 'A-02' })),
    ).toEqual(['/setores', sectorId, 'gaiolas', cageId, 'peso']);
  });
});
