import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { Notification } from '../../../../shared/domain/notification';
import { ListDailyReportsUseCase } from '../../../application/daily-report/list-daily-reports.usecase';
import { DailyReportPage, DailyReportSummary, ReportingSector } from '../../../domain/daily-report';
import { ReportChanges } from '../report-changes';
import { ReportListPage } from './report-list-page';

/**
 * Os relatórios diários de um setor (US1 e US4; FR-016, FR-017, FR-020): do dia mais recente para o mais
 * antigo, com o que falta lançar em cada um, e o caminho para abrir o relatório do dia.
 */
describe('ReportListPage', () => {
  const sectorId = '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33';
  const sector: ReportingSector = { id: sectorId, name: 'Codornas — Galpão 4', status: 'ACTIVE' };

  function summary(overrides: Partial<DailyReportSummary> = {}): DailyReportSummary {
    return {
      id: '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55',
      collectionDate: '2026-09-24',
      collectionTime: '06:30',
      openedByName: 'Marina Alves',
      flockAge: 20,
      collectedEggs: 2112,
      removedBirds: 2,
      closingBirdCount: 2398,
      note: 'Bebedouro da bateria B trocado.',
      productionStatus: 'COMPLETE',
      pendingCages: 0,
      mortalityStatus: 'RECORDED',
      ...overrides,
    };
  }

  function pageOf(content: readonly DailyReportSummary[], overrides: Partial<DailyReportPage> = {}): DailyReportPage {
    return { sector, content, page: 0, size: 20, totalElements: content.length, totalPages: 1, ...overrides };
  }

  let list: Mock;
  let fixture: ComponentFixture<ReportListPage>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function link(text: string): HTMLAnchorElement | undefined {
    return Array.from(element().querySelectorAll<HTMLAnchorElement>('a')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  }

  function rows(): HTMLTableRowElement[] {
    return Array.from(element().querySelectorAll<HTMLTableRowElement>('tbody tr'));
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ReportListPage],
      providers: [
        provideRouter([]),
        { provide: ListDailyReportsUseCase, useValue: { execute: list } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ sectorId }) } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReportListPage);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    list = vi.fn().mockResolvedValue(success(pageOf([summary()])));
  });

  afterEach(() => element()?.remove());

  it('asks for the first page of the reports of the sector', async () => {
    await render();

    expect(list).toHaveBeenCalledWith(sectorId, { page: 0, size: 20 });
  });

  it('shows each report with its day, who opened it, the age, the eggs, the removed birds, the balance and the note', async () => {
    await render();

    const text = rows()[0].textContent ?? '';
    expect(text).toContain('Qui, 24/09/2026');
    expect(text).toContain('06:30 · Marina Alves');
    expect(text).toContain('20 sem.');
    expect(text).toContain('2.112');
    expect(text).toContain('2.398');
    expect(text).toContain('Bebedouro da bateria B trocado.');
  });

  it('shows a dash for a report without note', async () => {
    list.mockResolvedValue(success(pageOf([summary({ note: undefined })])));

    await render();

    expect(rows()[0].querySelector('[data-label="Observação"]')?.textContent?.trim()).toBe('—');
  });

  it('says what is complete and what is still to be recorded in each report', async () => {
    list.mockResolvedValue(
      success(
        pageOf([
          summary({ id: 'hoje', collectionDate: '2026-09-25', productionStatus: 'PENDING', pendingCages: 1, mortalityStatus: 'PENDING' }),
          summary({ id: 'ontem', productionStatus: 'PENDING', pendingCages: 3 }),
          summary({ id: 'anteontem', collectionDate: '2026-09-23' }),
        ]),
      ),
    );

    await render();

    const [today, yesterday, before] = rows();
    expect(today.querySelector('.tag.pending')?.textContent?.trim()).toBe('Produção: falta 1 gaiola');
    expect(Array.from(today.querySelectorAll('.tag.pending')).map((tag) => tag.textContent?.trim())).toContain(
      'Mortalidade pendente',
    );
    expect(yesterday.textContent).toContain('Produção: faltam 3 gaiolas');
    expect(before.querySelector('.tag.pending')).toBeNull();
    expect(before.textContent).toContain('Produção completa');
    expect(before.textContent).toContain('Mortalidade lançada');
  });

  it('leads from each report to its page, named by its day', async () => {
    await render();

    // O nome do link é o texto que ele mostra (WCAG 2.5.3): quem fala com o leitor de tela diz o que vê.
    const report = rows()[0].querySelector<HTMLAnchorElement>('a.cell-id');
    expect(report?.getAttribute('href')).toBe(`/setores/${sectorId}/relatorios/6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55`);
    expect(report?.hasAttribute('aria-label')).toBe(false);
    expect(report?.textContent).toContain('Qui, 24/09/2026');
  });

  it('opens a new report from the header', async () => {
    await render();

    expect(link('Novo relatório')?.getAttribute('href')).toBe(`/setores/${sectorId}/relatorios/novo`);
    expect(link('Voltar aos setores')?.getAttribute('href')).toBe('/setores');
  });

  it('shows the sector in the header and names the table by it', async () => {
    await render();

    expect(element().querySelector('.page-head')?.textContent).toContain('Codornas — Galpão 4');
    expect(element().querySelector('caption')?.textContent).toContain('Relatórios do setor Codornas — Galpão 4');
  });

  it('asks for the next page from the pager', async () => {
    list.mockResolvedValue(success(pageOf([summary()], { totalElements: 45, totalPages: 3 })));
    await render();
    list.mockClear();

    element().querySelector<HTMLButtonElement>('[aria-label="Página 2"]')!.click();
    await settle();

    expect(list).toHaveBeenCalledWith(sectorId, { page: 1, size: 20 });
  });

  it('invites to open the first report of a sector without reports', async () => {
    list.mockResolvedValue(success(pageOf([])));

    await render();

    const empty = element().querySelector('.empty')!;
    expect(empty.textContent).toContain('Nenhum relatório ainda');
    expect(empty.textContent).toContain('Abra o primeiro relatório do dia');
    expect(empty.querySelector('a')?.getAttribute('href')).toBe(`/setores/${sectorId}/relatorios/novo`);
  });

  it('keeps the reports of an inactive sector for consultation only', async () => {
    list.mockResolvedValue(success(pageOf([summary()], { sector: { ...sector, status: 'INACTIVE' } })));

    await render();

    expect(element().textContent).toContain('O setor está inativo: os relatórios dele são só para consulta.');
    expect(link('Novo relatório')).toBeUndefined();
    expect(rows()).toHaveLength(1);
  });

  it('does not invite to open a report in an inactive sector without reports', async () => {
    list.mockResolvedValue(success(pageOf([], { sector: { ...sector, status: 'INACTIVE' } })));

    await render();

    expect(element().querySelector('.empty')?.textContent).toContain('O setor está inativo e não recebe relatórios novos.');
    expect(element().querySelector('.empty a')).toBeNull();
  });

  it('says the sector was not found for an address of no sector', async () => {
    list.mockResolvedValue(
      failure(Notification.of([{ code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado.' }])),
    );

    await render();

    expect(element().textContent).toContain('Setor não encontrado.');
    expect(link('Novo relatório')).toBeUndefined();
  });

  it('filters the list by the day of the collection', async () => {
    await render();
    list.mockClear();

    const day = element().querySelector<HTMLInputElement>('#searchedDay')!;
    expect(day.type).toBe('date');
    day.value = '2026-09-24';
    day.dispatchEvent(new Event('input'));
    element().querySelector('form[role="search"]')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(list).toHaveBeenCalledWith(sectorId, { collectionDate: '2026-09-24', page: 0, size: 20 });
  });

  it('gives the day of the search an id of its own, apart from the date field of the dialog over the list', async () => {
    await render();

    expect(element().querySelector('#collectionDate')).toBeNull();
    expect(element().querySelector<HTMLInputElement>('#searchedDay')?.labels?.[0]?.textContent?.trim()).toBe(
      'Dia da coleta',
    );
  });

  it('clears the filter of the day, and lists every report again', async () => {
    await render();
    const day = element().querySelector<HTMLInputElement>('#searchedDay')!;
    day.value = '2026-09-24';
    day.dispatchEvent(new Event('input'));
    element().querySelector('form[role="search"]')!.dispatchEvent(new Event('submit'));
    await settle();
    list.mockClear();

    Array.from(element().querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim() === 'Limpar')!
      .click();
    await settle();

    expect(list).toHaveBeenCalledWith(sectorId, { page: 0, size: 20 });
    expect(element().querySelector<HTMLInputElement>('#searchedDay')!.value).toBe('');
  });

  it('says there is no report on the day searched, and not that the sector has none', async () => {
    await render();
    list.mockResolvedValue(success(pageOf([])));
    const day = element().querySelector<HTMLInputElement>('#searchedDay')!;
    day.value = '2026-09-20';
    day.dispatchEvent(new Event('input'));

    element().querySelector('form[role="search"]')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(element().textContent).toContain('Nenhum relatório em 20/09/2026');
    expect(element().textContent).not.toContain('Nenhum relatório ainda');
  });

  it('moves the focus to the notice when the sector turns out inactive with the focus lost', async () => {
    await render();
    list.mockResolvedValue(success(pageOf([summary()], { sector: { ...sector, status: 'INACTIVE' } })));
    (document.activeElement as HTMLElement | null)?.blur();

    TestBed.inject(ReportChanges).notify();
    await settle();
    await settle();

    expect(document.activeElement?.hasAttribute('data-inactive-notice')).toBe(true);
  });

  it('asks again when a report is opened in the dialog', async () => {
    await render();
    list.mockClear();

    TestBed.inject(ReportChanges).notify();
    await settle();

    expect(list).toHaveBeenCalledWith(sectorId, { page: 0, size: 20 });
  });
});
