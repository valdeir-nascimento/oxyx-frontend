import { HttpHeaders, provideHttpClient } from '@angular/common/http';
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
    feed: { status: 'PENDING', pendingCages: 2, consumption: 0, cost: 0 },
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

  describe('feed (004, US2)', () => {
    const formulas = '/api/v1/feed-formulas';
    const posturaPlus = {
      id: '4e6a8c0e-2a4c-4e6a-9c0e-2a4c6e8a0c11',
      name: 'Postura Plus',
      pricePerKg: 2.85,
      expectedIntake: 28,
    };

    it('lists the active formulas the feed can use, from the formulas of the farm', async () => {
      const pending = adapter.listActiveFormulas();

      const request = backend.expectOne((candidate) => candidate.url === formulas);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.get('status')).toBe('ACTIVE');
      request.flush([{ ...posturaPlus, costPerBirdDay: 0.08, status: 'ACTIVE' }]);

      const result = await pending;
      expect(result.success && result.value).toEqual([posturaPlus]);
    });

    it('asks for the suggestion of the sector with the formula in the query', async () => {
      const suggestion = { formula: posturaPlus, cages: [], totals: report.feed };
      const pending = adapter.suggestFeed(sectorId, report.id, posturaPlus.id);

      const request = backend.expectOne((candidate) => candidate.url === `${reports}/${report.id}/feed-suggestion`);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.get('formulaId')).toBe(posturaPlus.id);
      request.flush(suggestion);

      const result = await pending;
      expect(result.success && result.value).toEqual(suggestion);
    });

    it('puts the feed of a cage with the consumption as a number (004, US3)', async () => {
      const pending = adapter.recordFeed(sectorId, report.id, 'b/07', { formulaId: posturaPlus.id, consumption: '1.250' });

      const request = backend.expectOne(`${reports}/${report.id}/cages/b%2F07/feed`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ formulaId: posturaPlus.id, consumption: 1250 });
      request.flush({ cageId: 'b/07', code: 'B-07', battery: 'B', number: 7, birdCount: 50 });

      const result = await pending;
      expect(result.success && result.value.code).toBe('B-07');
    });

    it('posts the feed of the sector by the suggestion with the formula', async () => {
      const pending = adapter.recordFeedBySuggestion(sectorId, report.id, posturaPlus.id);

      const request = backend.expectOne(`${reports}/${report.id}/feed`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ formulaId: posturaPlus.id });
      request.flush(report);

      const result = await pending;
      expect(result.success && result.value.id).toBe(report.id);
    });
  });

  describe('dashboard (006, US1)', () => {
    it('asks for the overview of the dashboard', async () => {
      const pending = adapter.getDashboardOverview();

      const request = backend.expectOne('/api/v1/dashboard');
      expect(request.request.method).toBe('GET');
      request.flush({ today: '2026-09-24', partOfDay: 'MORNING', activeSectors: 3, completeToday: 2, sectors: [] });

      const result = await pending;
      expect(result.success && result.value.completeToday).toBe(2);
    });

    it('asks for the dashboard of the sector, with the period in the query and the identifier encoded', async () => {
      const pending = adapter.getSectorDashboard('galpão/1', 'LAST_7_DAYS');

      const request = backend.expectOne(
        (candidate) => candidate.url === '/api/v1/sectors/galp%C3%A3o%2F1/dashboard',
      );
      expect(request.request.method).toBe('GET');
      expect(request.request.params.get('period')).toBe('LAST_7_DAYS');
      request.flush({ period: 'LAST_7_DAYS', trend: [] });

      const result = await pending;
      expect(result.success && result.value.period).toBe('LAST_7_DAYS');
    });

    it('asks for the dashboard of the whole farm, with the period in the query (009)', async () => {
      const pending = adapter.getFarmDashboard('LAST_7_DAYS');

      const request = backend.expectOne((candidate) => candidate.url === '/api/v1/dashboard/farm');
      expect(request.request.method).toBe('GET');
      expect(request.request.params.get('period')).toBe('LAST_7_DAYS');
      request.flush({ period: 'LAST_7_DAYS', trend: [], sectors: [] });

      const result = await pending;
      expect(result.success && result.value.period).toBe('LAST_7_DAYS');
    });

    it('turns the refusal of an unknown sector into the notification', async () => {
      const pending = adapter.getSectorDashboard(sectorId, 'TODAY');

      backend
        .expectOne((candidate) => candidate.url === `/api/v1/sectors/${sectorId}/dashboard`)
        .flush(
          { code: 'SECTOR_NOT_FOUND', title: 'Não encontrado', status: 404, detail: 'Setor não encontrado.' },
          { status: 404, statusText: 'Not Found' },
        );

      const result = await pending;
      expect(!result.success && result.notification.errors[0].code).toBe('SECTOR_NOT_FOUND');
    });
  });

  // ---------------------------------------------------------------- exportação (007)

  const spreadsheet = new Blob(['PK'], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  it('asks for the spreadsheet of the reports of the interval, as a file', async () => {
    const pending = adapter.exportDailyReports(sectorId, '2026-09-01', '2026-09-28');

    const request = backend.expectOne((candidate) => candidate.url === `${reports}/export`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('from')).toBe('2026-09-01');
    expect(request.request.params.get('to')).toBe('2026-09-28');
    expect(request.request.responseType).toBe('blob');
    request.flush(spreadsheet, {
      headers: new HttpHeaders({
        'Content-Disposition': 'attachment; filename="relatorios-codornas-galpao-4-01-09-2026-a-28-09-2026.xlsx"',
      }),
    });

    const result = await pending;
    expect(result.success && result.value.name).toBe('relatorios-codornas-galpao-4-01-09-2026-a-28-09-2026.xlsx');
  });

  it('leaves out a date left blank, for the backend to say it is missing', async () => {
    const pending = adapter.exportDailyReports(sectorId, '', '2026-09-28');

    const request = backend.expectOne((candidate) => candidate.url === `${reports}/export`);
    expect(request.request.params.has('from')).toBe(false);
    expect(request.request.params.get('to')).toBe('2026-09-28');
    request.flush(spreadsheet);

    await pending;
  });

  it('turns the refusal of the interval, sent as a Blob, into the messages of each date', async () => {
    const pending = adapter.exportDailyReports(sectorId, '2026-09-28', '2026-09-01');

    backend.expectOne((candidate) => candidate.url === `${reports}/export`).flush(
      new Blob(
        [
          JSON.stringify({
            code: 'VALIDATION_FAILED',
            title: 'Dados inválidos',
            status: 400,
            details: { to: 'A data final deve ser igual ou posterior à inicial.' },
          }),
        ],
        { type: 'application/problem+json' },
      ),
      { status: 400, statusText: 'Bad Request' },
    );

    const result = await pending;
    expect(!result.success && result.notification.messageFor('to')).toBe(
      'A data final deve ser igual ou posterior à inicial.',
    );
  });

  it('asks for the spreadsheet of the whole farm in the period, as a file (009)', async () => {
    const pending = adapter.exportFarmDashboard('LAST_7_DAYS');

    const request = backend.expectOne((candidate) => candidate.url === '/api/v1/dashboard/farm/export');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('period')).toBe('LAST_7_DAYS');
    expect(request.request.responseType).toBe('blob');
    request.flush(spreadsheet, {
      headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="painel-granja-28-09-2026.xlsx"' }),
    });

    const result = await pending;
    expect(result.success && result.value.name).toBe('painel-granja-28-09-2026.xlsx');
  });

  it('asks for the spreadsheet of the dashboard of the sector in the period, as a file', async () => {
    const pending = adapter.exportSectorDashboard('galpão/1', 'LAST_7_DAYS');

    const request = backend.expectOne(
      (candidate) => candidate.url === `/api/v1/sectors/${encodeURIComponent('galpão/1')}/dashboard/export`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('period')).toBe('LAST_7_DAYS');
    expect(request.request.responseType).toBe('blob');
    request.flush(spreadsheet, {
      headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="painel-galpao-1-28-09-2026.xlsx"' }),
    });

    const result = await pending;
    expect(result.success && result.value.name).toBe('painel-galpao-1-28-09-2026.xlsx');
  });
});
