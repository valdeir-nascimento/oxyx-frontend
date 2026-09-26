import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { success } from '../../../shared/application/result';
import { ConfirmNoMortalityUseCase } from './confirm-no-mortality.usecase';
import { CorrectDailyReportUseCase } from './correct-daily-report.usecase';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';
import { FindDailyReportUseCase } from './find-daily-report.usecase';
import { FindReportCageUseCase } from './find-report-cage.usecase';
import { ListDailyReportsUseCase } from './list-daily-reports.usecase';
import { OpenDailyReportUseCase } from './open-daily-report.usecase';
import { RecordMortalityUseCase } from './record-mortality.usecase';
import { RecordProductionUseCase } from './record-production.usecase';
import { SuggestDailyReportUseCase } from './suggest-daily-report.usecase';

/** Os casos de uso do relatório entregam ao backend o que a pessoa pediu, sem regra no cliente. */
describe('daily report use cases', () => {
  const sectorId = '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33';
  let gateway: Record<string, Mock>;

  beforeEach(() => {
    gateway = {
      listDailyReports: vi.fn().mockResolvedValue(success(null)),
      suggestDailyReport: vi.fn().mockResolvedValue(success(null)),
      openDailyReport: vi.fn().mockResolvedValue(success(null)),
      findDailyReport: vi.fn().mockResolvedValue(success(null)),
      findReportCage: vi.fn().mockResolvedValue(success(null)),
      recordProduction: vi.fn().mockResolvedValue(success(null)),
      recordMortality: vi.fn().mockResolvedValue(success(null)),
      confirmNoMortality: vi.fn().mockResolvedValue(success(null)),
      correctDailyReport: vi.fn().mockResolvedValue(success(null)),
    };
    TestBed.configureTestingModule({ providers: [{ provide: DAILY_REPORT_GATEWAY, useValue: gateway }] });
  });

  it('lists the reports of the sector', async () => {
    await TestBed.inject(ListDailyReportsUseCase).execute(sectorId, { page: 2, size: 20 });

    expect(gateway['listDailyReports']).toHaveBeenCalledWith(sectorId, { page: 2, size: 20 });
  });

  it('asks for the suggestion of the new report', async () => {
    await TestBed.inject(SuggestDailyReportUseCase).execute(sectorId);

    expect(gateway['suggestDailyReport']).toHaveBeenCalledWith(sectorId);
  });

  it('opens a report with the fields as typed', async () => {
    const input = {
      collectionDate: '2026-09-25',
      collectionTime: '06:42',
      openingBirdCount: '96',
      flockAge: '20',
      note: '',
    };

    await TestBed.inject(OpenDailyReportUseCase).execute(sectorId, input);

    expect(gateway['openDailyReport']).toHaveBeenCalledWith(sectorId, input);
  });

  it('finds a cage of the report', async () => {
    await TestBed.inject(FindReportCageUseCase).execute(sectorId, 'report-1', 'cage-1');

    expect(gateway['findReportCage']).toHaveBeenCalledWith(sectorId, 'report-1', 'cage-1');
  });

  it('records the production of a cage with the fields as typed', async () => {
    const input = { eggs: '45', small: '', jumbo: '1', dirty: '1', cracked: '2', bloodSpot: '1', abnormal: '' };

    await TestBed.inject(RecordProductionUseCase).execute(sectorId, 'report-1', 'cage-1', input);

    expect(gateway['recordProduction']).toHaveBeenCalledWith(sectorId, 'report-1', 'cage-1', input);
  });

  it('records the mortality of a cage with the fields as typed', async () => {
    const input = { deaths: '2', culls: '', note: 'Prostração.' };

    await TestBed.inject(RecordMortalityUseCase).execute(sectorId, 'report-1', 'cage-1', input);

    expect(gateway['recordMortality']).toHaveBeenCalledWith(sectorId, 'report-1', 'cage-1', input);
  });

  it('confirms the day without occurrence of a report', async () => {
    await TestBed.inject(ConfirmNoMortalityUseCase).execute(sectorId, 'report-1');

    expect(gateway['confirmNoMortality']).toHaveBeenCalledWith(sectorId, 'report-1');
  });

  it('corrects the general data of a report with the fields as typed', async () => {
    const input = { collectionDate: '2026-09-24', collectionTime: '06:45', openingBirdCount: '96', flockAge: '21', note: '' };

    await TestBed.inject(CorrectDailyReportUseCase).execute(sectorId, 'report-1', input);

    expect(gateway['correctDailyReport']).toHaveBeenCalledWith(sectorId, 'report-1', input);
  });

  it('finds a report of the sector', async () => {
    await TestBed.inject(FindDailyReportUseCase).execute(sectorId, 'report-1');

    expect(gateway['findDailyReport']).toHaveBeenCalledWith(sectorId, 'report-1');
  });
});
