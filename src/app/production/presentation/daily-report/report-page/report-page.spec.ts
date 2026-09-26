import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { failure, success } from '../../../../shared/application/result';
import { Notification } from '../../../../shared/domain/notification';
import { FindDailyReportUseCase } from '../../../application/daily-report/find-daily-report.usecase';
import { DailyReport } from '../../../domain/daily-report';
import { ReportChanges } from '../report-changes';
import { ReportView } from '../report-view';
import { ReportPage } from './report-page';

/**
 * A página do relatório (US1 a US4): o cabeçalho com o dia, quem abriu, a idade, as aves e a situação
 * dos lançamentos.
 */
describe('ReportPage', () => {
  const sectorId = '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33';
  const reportId = '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55';
  const report: DailyReport = {
    id: reportId,
    sector: { id: sectorId, name: 'Codornas — Galpão 4', status: 'ACTIVE' },
    collectionDate: '2026-09-24',
    collectionTime: '06:30',
    openingBirdCount: 2400,
    flockAge: 20,
    noMortalityConfirmed: false,
    openedBy: { id: '1e3a5c7b-9d1f-4b3d-8e5a-7c9e1a3b5d77', name: 'Marina Alves' },
    openedAt: '2026-09-24T09:31:40Z',
    production: { status: 'PENDING', pendingCages: 2, collectedEggs: 0, standardEggs: 0, unsellableEggs: 0, layingRate: 0 },
    mortality: { status: 'PENDING', deaths: 0, culls: 0, removalRate: 0, closingBirdCount: 2400 },
    cages: [],
  };

  let find: Mock;
  let params: BehaviorSubject<ParamMap>;
  let fixture: ComponentFixture<ReportPage>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ReportPage],
      providers: [
        provideRouter([]),
        { provide: FindDailyReportUseCase, useValue: { execute: find } },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReportPage);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ sectorId, reportId }));
    find = vi.fn().mockResolvedValue(success(report));
  });

  afterEach(() => element()?.remove());

  it('shows the day, the sector, the time, who opened it, the age and the birds of the report', async () => {
    await render();

    expect(find).toHaveBeenCalledWith(sectorId, reportId);
    const head = element().querySelector('.page-head')!.textContent ?? '';
    expect(head).toContain('Codornas — Galpão 4');
    expect(head).toContain('Relatório de 24/09/2026');
    const meta = element().querySelector('.meta-row')!.textContent ?? '';
    expect(meta).toContain('Coleta às 06:30');
    expect(meta).toContain('Aberto por Marina Alves');
    expect(meta).toContain('Idade: 20 semanas');
    expect(meta).toContain('2.400 aves no início do dia');
  });

  it('says what is still to be recorded', async () => {
    await render();

    const pending = Array.from(element().querySelectorAll('.tag.pending')).map((tag) => tag.textContent?.trim());
    expect(pending).toEqual(['Produção: faltam 2 gaiolas', 'Mortalidade pendente']);
  });

  it('leads to the production and the mortality tabs, each marked as pending while it lacks entries', async () => {
    await render();

    const tabs = Array.from(element().querySelectorAll<HTMLAnchorElement>('nav.tabs a'));
    expect(tabs.map((tab) => tab.getAttribute('href'))).toEqual([
      `/setores/${sectorId}/relatorios/${reportId}/producao`,
      `/setores/${sectorId}/relatorios/${reportId}/mortalidade`,
    ]);
    expect(tabs.map((tab) => tab.querySelector('.cnt')?.textContent?.trim())).toEqual(['pendente', 'pendente']);
  });

  it('leaves the pending mark out of the tabs whose entries are done', async () => {
    find.mockResolvedValue(
      success({
        ...report,
        production: { ...report.production, status: 'COMPLETE', pendingCages: 0 },
        mortality: { ...report.mortality, status: 'RECORDED' },
      }),
    );

    await render();

    expect(element().querySelectorAll('nav.tabs .cnt')).toHaveLength(0);
  });

  it('shares the report it loaded with the tabs', async () => {
    await render();

    expect(fixture.debugElement.injector.get(ReportView).report()?.id).toBe(reportId);
  });

  it('follows the address to another report, and shows that one', async () => {
    const otherId = '8e2a4c6e-0a2c-4e6a-8c0e-2a4c6e8a0c99';
    await render();
    find.mockResolvedValue(success({ ...report, id: otherId, collectionDate: '2026-09-23', flockAge: 21 }));

    params.next(convertToParamMap({ sectorId, reportId: otherId }));
    await settle();
    await settle();

    expect(find).toHaveBeenLastCalledWith(sectorId, otherId);
    expect(element().querySelector('.page-head')?.textContent).toContain('Relatório de 23/09/2026');
    expect(element().querySelector('.meta-row')?.textContent).toContain('Idade: 21 semanas');
    const edit = Array.from(element().querySelectorAll<HTMLAnchorElement>('a')).find(
      (link) => link.textContent?.trim() === 'Editar relatório',
    );
    expect(edit?.getAttribute('href')).toBe(`/setores/${sectorId}/relatorios/${otherId}/producao/editar`);
  });

  it('writes the age of a one-week flock in the singular', async () => {
    find.mockResolvedValue(success({ ...report, flockAge: 1 }));

    await render();

    expect(element().querySelector('.meta-row')?.textContent).toContain('Idade: 1 semana');
    expect(element().querySelector('.meta-row')?.textContent).not.toContain('1 semanas');
  });

  it('says who corrected the report last, and when, at the farm', async () => {
    find.mockResolvedValue(
      success({
        ...report,
        lastCorrectedBy: { id: '5d7f9b1d-3f5a-4c7e-9a1b-3d5f7a9c1e88', name: 'João Pereira' },
        lastCorrectedAt: '2026-09-24T11:05:12Z',
      }),
    );

    await render();

    const meta = element().querySelector('.meta-row')!.textContent ?? '';
    expect(meta).toContain('Aberto por Marina Alves');
    expect(meta).toContain('Corrigido por João Pereira em 24/09/2026, 08:05');
  });

  it('says nothing of a correction that never happened', async () => {
    await render();

    expect(element().textContent).not.toContain('Corrigido por');
  });

  it('leads to the correction of the general data, over the tab in use', async () => {
    await render();

    const edit = Array.from(element().querySelectorAll<HTMLAnchorElement>('a')).find(
      (link) => link.textContent?.trim() === 'Editar relatório',
    );
    expect(edit?.getAttribute('href')).toBe(`/setores/${sectorId}/relatorios/${reportId}/producao/editar`);
  });

  it('offers no correction in an inactive sector', async () => {
    find.mockResolvedValue(success({ ...report, sector: { ...report.sector, status: 'INACTIVE' } }));

    await render();

    const edit = Array.from(element().querySelectorAll('a')).find((link) => link.textContent?.trim() === 'Editar relatório');
    expect(edit).toBeUndefined();
  });

  it('goes back to the reports of the sector', async () => {
    await render();

    const back = Array.from(element().querySelectorAll<HTMLAnchorElement>('a')).find(
      (link) => link.textContent?.trim() === 'Voltar aos relatórios',
    );
    expect(back?.getAttribute('href')).toBe(`/setores/${sectorId}/relatorios`);
  });

  it('says the report was not found for an address of no report', async () => {
    find.mockResolvedValue(
      failure(Notification.of([{ code: 'DAILY_REPORT_NOT_FOUND', message: 'Relatório não encontrado.' }])),
    );

    await render();

    expect(element().textContent).toContain('Relatório não encontrado.');
  });

  it('says the sector was not found for an address of no sector', async () => {
    find.mockResolvedValue(failure(Notification.of([{ code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado.' }])));

    await render();

    expect(element().textContent).toContain('Setor não encontrado.');
  });

  it('keeps the report of an inactive sector for consultation only', async () => {
    find.mockResolvedValue(success({ ...report, sector: { ...report.sector, status: 'INACTIVE' } }));

    await render();

    expect(element().textContent).toContain('O setor está inativo: os relatórios dele são só para consulta.');
  });

  it('asks again when something of the report is recorded', async () => {
    await render();
    find.mockClear();

    TestBed.inject(ReportChanges).notify();
    await settle();

    expect(find).toHaveBeenCalledWith(sectorId, reportId);
  });
});
