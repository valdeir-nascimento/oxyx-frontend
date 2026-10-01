import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { failure, success } from '../../../shared/application/result';
import { FILE_SAVER } from '../../../shared/application/file-saver';
import { Notification } from '../../../shared/domain/notification';
import { DASHBOARD_GATEWAY } from './dashboard-gateway';
import { ExportFarmDashboardUseCase } from './export-farm-dashboard.usecase';
import { ExportSectorDashboardUseCase } from './export-sector-dashboard.usecase';
import { GetDashboardOverviewUseCase } from './get-dashboard-overview.usecase';
import { GetFarmDashboardUseCase } from './get-farm-dashboard.usecase';
import { GetSectorDashboardUseCase } from './get-sector-dashboard.usecase';

/** Os casos de uso do painel pedem ao backend o que a tela mostra, sem conta nenhuma no cliente (R-009 da 006). */
describe('dashboard use cases', () => {
  const sectorId = '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11';
  let gateway: Record<string, Mock>;
  let saver: { save: Mock };

  beforeEach(() => {
    gateway = {
      getDashboardOverview: vi.fn().mockResolvedValue(success(null)),
      getSectorDashboard: vi.fn().mockResolvedValue(success(null)),
      getFarmDashboard: vi.fn().mockResolvedValue(success(null)),
      exportSectorDashboard: vi.fn(),
      exportFarmDashboard: vi.fn(),
    };
    saver = { save: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: DASHBOARD_GATEWAY, useValue: gateway },
        { provide: FILE_SAVER, useValue: saver },
      ],
    });
  });

  it('asks for the overview of the dashboard and hands the answer back', async () => {
    const overview = {
      today: '2026-09-24',
      partOfDay: 'MORNING',
      activeSectors: 1,
      completeToday: 1,
      sectors: [],
    };
    gateway['getDashboardOverview'].mockResolvedValue(success(overview));

    const result = await TestBed.inject(GetDashboardOverviewUseCase).execute();

    expect(gateway['getDashboardOverview']).toHaveBeenCalled();
    expect(result.success && result.value).toBe(overview);
  });

  it('asks for the dashboard of the whole farm in the period (009)', async () => {
    const farm = { period: 'LAST_7_DAYS' };
    gateway['getFarmDashboard'].mockResolvedValue(success(farm));

    const result = await TestBed.inject(GetFarmDashboardUseCase).execute('LAST_7_DAYS');

    expect(gateway['getFarmDashboard']).toHaveBeenCalledWith('LAST_7_DAYS');
    expect(result.success && result.value).toBe(farm);
  });

  it('asks for the dashboard of the sector in the period', async () => {
    const dashboard = { period: 'YESTERDAY' };
    gateway['getSectorDashboard'].mockResolvedValue(success(dashboard));

    const result = await TestBed.inject(GetSectorDashboardUseCase).execute(sectorId, 'YESTERDAY');

    expect(gateway['getSectorDashboard']).toHaveBeenCalledWith(sectorId, 'YESTERDAY');
    expect(result.success && result.value).toBe(dashboard);
  });

  it('exports the dashboard of the sector in the period, saves the spreadsheet and hands its name back (007)', async () => {
    const file = { name: 'painel-codornas-galpao-1-28-09-2026.xlsx', content: new Blob(['PK']) };
    gateway['exportSectorDashboard'].mockResolvedValue(success(file));

    const result = await TestBed.inject(ExportSectorDashboardUseCase).execute(sectorId, 'LAST_7_DAYS');

    expect(gateway['exportSectorDashboard']).toHaveBeenCalledWith(sectorId, 'LAST_7_DAYS');
    expect(saver.save).toHaveBeenCalledWith(file);
    expect(result).toEqual(success(file.name));
  });

  it('exports the whole farm in the period, saves the spreadsheet and hands its name back (009)', async () => {
    const file = { name: 'painel-granja-28-09-2026.xlsx', content: new Blob(['PK']) };
    gateway['exportFarmDashboard'].mockResolvedValue(success(file));

    const result = await TestBed.inject(ExportFarmDashboardUseCase).execute('LAST_7_DAYS');

    expect(gateway['exportFarmDashboard']).toHaveBeenCalledWith('LAST_7_DAYS');
    expect(saver.save).toHaveBeenCalledWith(file);
    expect(result).toEqual(success(file.name));
  });

  it('saves nothing when the export of the farm is refused (009)', async () => {
    const refusal = Notification.of([{ code: 'VALIDATION_FAILED', message: 'Período inválido.' }]);
    gateway['exportFarmDashboard'].mockResolvedValue(failure(refusal));

    const result = await TestBed.inject(ExportFarmDashboardUseCase).execute('TODAY');

    expect(saver.save).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it('saves nothing when the export is refused (007)', async () => {
    const refusal = Notification.of([{ code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado.' }]);
    gateway['exportSectorDashboard'].mockResolvedValue(failure(refusal));

    const result = await TestBed.inject(ExportSectorDashboardUseCase).execute(sectorId, 'TODAY');

    expect(saver.save).not.toHaveBeenCalled();
    expect(result).toEqual(failure(refusal));
  });
});
