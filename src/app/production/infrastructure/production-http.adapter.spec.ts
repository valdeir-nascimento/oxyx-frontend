import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DailyReport, DailyReportPage, DailyReportSuggestion } from '../domain/daily-report';
import { ProductionHttpAdapter } from './production-http.adapter';

/**
 * O adaptador é o único lugar do contexto production que conhece HTTP: o método, o caminho, os
 * parâmetros, o corpo enviado e a tradução da recusa do backend em `Notification`
 * (contracts/production-api.yaml).
 */
describe('ProductionHttpAdapter', () => {
  const sectorId = '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33';
  const reports = `/api/v1/sectors/${sectorId}/daily-reports`;
  let adapter: ProductionHttpAdapter;
  let backend: HttpTestingController;

  const page: DailyReportPage = {
    sector: { id: sectorId, name: 'Codornas — Galpão 4', status: 'ACTIVE' },
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  };

  const report: DailyReport = {
    id: '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55',
    sector: { id: sectorId, name: 'Codornas — Galpão 4', status: 'ACTIVE' },
    collectionDate: '2026-09-24',
    collectionTime: '06:30',
    openingBirdCount: 98,
    flockAge: 20,
    noMortalityConfirmed: false,
    openedBy: { id: '1e3a5c7b-9d1f-4b3d-8e5a-7c9e1a3b5d77', name: 'Marina Alves' },
    openedAt: '2026-09-24T09:31:40Z',
    production: { status: 'PENDING', pendingCages: 2, collectedEggs: 0, standardEggs: 0, unsellableEggs: 0, layingRate: 0 },
    mortality: { status: 'PENDING', deaths: 0, culls: 0, removalRate: 0, closingBirdCount: 98 },
    cages: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProductionHttpAdapter, provideHttpClient(), provideHttpClientTesting()],
    });
    adapter = TestBed.inject(ProductionHttpAdapter);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('lists the reports of the sector, page by page', async () => {
    const pending = adapter.listDailyReports(sectorId, { page: 1, size: 20 });

    const request = backend.expectOne((candidate) => candidate.url === reports);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.has('collectionDate')).toBe(false);
    request.flush(page);

    const result = await pending;
    expect(result.success && result.value).toEqual(page);
  });

  it('filters the list by the date of the collection', async () => {
    const pending = adapter.listDailyReports(sectorId, { collectionDate: '2026-09-24', page: 0, size: 1 });

    const request = backend.expectOne((candidate) => candidate.url === reports);
    expect(request.request.params.get('collectionDate')).toBe('2026-09-24');
    request.flush(page);

    await pending;
  });

  it('asks for the suggestion of the new report', async () => {
    const suggestion: DailyReportSuggestion = {
      collectionDate: '2026-09-25',
      collectionTime: '06:42',
      openingBirdCount: 96,
      flockAge: 20,
    };
    const pending = adapter.suggestDailyReport(sectorId);

    const request = backend.expectOne(`${reports}/suggestion`);
    expect(request.request.method).toBe('GET');
    request.flush(suggestion);

    const result = await pending;
    expect(result.success && result.value).toEqual(suggestion);
  });

  it('opens a report with the quantities as numbers, and the rest as typed', async () => {
    const pending = adapter.openDailyReport(sectorId, {
      collectionDate: '2026-09-25',
      collectionTime: '06:42',
      openingBirdCount: ' 96 ',
      flockAge: '20',
      note: 'Tarde quente.',
    });

    const request = backend.expectOne(reports);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      collectionDate: '2026-09-25',
      collectionTime: '06:42',
      openingBirdCount: 96,
      flockAge: 20,
      note: 'Tarde quente.',
    });
    request.flush(report, { status: 201, statusText: 'Created' });

    const result = await pending;
    expect(result.success && result.value).toEqual(report);
  });

  it('sends a quantity that is not an integer as typed, and an empty one as absent', async () => {
    const pending = adapter.openDailyReport(sectorId, {
      collectionDate: '2026-09-25',
      collectionTime: '06:42',
      openingBirdCount: '12,5',
      flockAge: '',
      note: '',
    });

    const request = backend.expectOne(reports);
    expect(request.request.body).toEqual(
      expect.objectContaining({ openingBirdCount: '12,5', flockAge: null }),
    );
    request.flush(report, { status: 201, statusText: 'Created' });

    await pending;
  });

  it('finds a report by its identifiers, encoded in the path', async () => {
    // Os identificadores vêm do endereço da tela: sem codificar, um "../" chamaria outro endpoint.
    const pending = adapter.findDailyReport(sectorId, '../suggestion');

    const request = backend.expectOne(`${reports}/..%2Fsuggestion`);
    expect(request.request.method).toBe('GET');
    request.flush(report);

    const result = await pending;
    expect(result.success && result.value).toEqual(report);
  });

  it('corrects the general data of a report with the quantities as numbers', async () => {
    const pending = adapter.correctDailyReport(sectorId, report.id, {
      collectionDate: '2026-09-24',
      collectionTime: '06:45',
      openingBirdCount: '96',
      flockAge: '21',
      note: '',
    });

    const request = backend.expectOne(`${reports}/${report.id}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      collectionDate: '2026-09-24',
      collectionTime: '06:45',
      openingBirdCount: 96,
      flockAge: 21,
      note: '',
    });
    request.flush({ ...report, flockAge: 21 });

    const result = await pending;
    expect(result.success && result.value.flockAge).toBe(21);
  });

  it('finds a cage of the report, with the identifiers encoded in the path', async () => {
    const cage = { cageId: '9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44', code: 'B-07', battery: 'B', number: 7, birdCount: 50 };
    const pending = adapter.findReportCage(sectorId, report.id, '../b07');

    const request = backend.expectOne(`${reports}/${report.id}/cages/..%2Fb07`);
    expect(request.request.method).toBe('GET');
    request.flush(cage);

    const result = await pending;
    expect(result.success && result.value).toEqual(cage);
  });

  it('records the production of a cage with the quantities as numbers, and a blank grade as absent', async () => {
    const cageId = '9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44';
    const pending = adapter.recordProduction(sectorId, report.id, cageId, {
      eggs: '45',
      small: '',
      jumbo: '1',
      dirty: ' 1 ',
      cracked: '2,5',
      bloodSpot: '1',
      abnormal: '',
    });

    const request = backend.expectOne(`${reports}/${report.id}/cages/${cageId}/production`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      eggs: 45,
      small: null,
      jumbo: 1,
      dirty: 1,
      cracked: '2,5',
      bloodSpot: 1,
      abnormal: null,
    });
    request.flush({ cageId, code: 'B-07', battery: 'B', number: 7, birdCount: 50 });

    const result = await pending;
    expect(result.success).toBe(true);
  });

  it('records the mortality of a cage with the quantities as numbers, and the note as typed', async () => {
    const cageId = '9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44';
    const pending = adapter.recordMortality(sectorId, report.id, cageId, {
      deaths: '2',
      culls: '',
      note: 'Prostração.',
    });

    const request = backend.expectOne(`${reports}/${report.id}/cages/${cageId}/mortality`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ deaths: 2, culls: null, note: 'Prostração.' });
    request.flush({ cageId, code: 'B-07', battery: 'B', number: 7, birdCount: 50 });

    const result = await pending;
    expect(result.success).toBe(true);
  });

  it('confirms the day without occurrence of a report', async () => {
    const pending = adapter.confirmNoMortality(sectorId, report.id);

    const request = backend.expectOne(`${reports}/${report.id}/mortality-confirmation`);
    expect(request.request.method).toBe('POST');
    request.flush({ ...report, noMortalityConfirmed: true });

    const result = await pending;
    expect(result.success && result.value.noMortalityConfirmed).toBe(true);
  });

  it('turns the refusal of the backend into the messages of each field', async () => {
    const pending = adapter.openDailyReport(sectorId, {
      collectionDate: '2026-09-26',
      collectionTime: '06:42',
      openingBirdCount: '0',
      flockAge: '20',
      note: '',
    });

    backend.expectOne(reports).flush(
      {
        code: 'VALIDATION_FAILED',
        title: 'Dados inválidos',
        status: 400,
        detail: 'Dados inválidos.',
        details: {
          collectionDate: 'A data da coleta não pode ser futura.',
          openingBirdCount: 'As aves do início do dia devem ficar entre 1 e 1.000.000.',
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    const result = await pending;
    expect(result.success).toBe(false);
    expect(!result.success && result.notification.messageFor('collectionDate')).toBe(
      'A data da coleta não pode ser futura.',
    );
    expect(!result.success && result.notification.messageFor('openingBirdCount')).toBe(
      'As aves do início do dia devem ficar entre 1 e 1.000.000.',
    );
  });
});
