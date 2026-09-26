import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DailyReport, ReportCage } from '../../../domain/daily-report';
import { ReportView } from '../report-view';
import { ProductionTabPage } from './production-tab-page';

/**
 * A aba de produção do relatório (US2; FR-007 a FR-010): a faixa com os totais do dia, a tabela das
 * gaiolas com a produção de cada uma e o caminho para lançar ou corrigir.
 */
describe('ProductionTabPage', () => {
  const sectorId = '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33';
  const reportId = '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55';
  const a01: ReportCage = {
    cageId: '2a4c6e8a-0b1d-4f3a-9c5e-7a9b1d3f5a66',
    code: 'A-01',
    battery: 'A',
    number: 1,
    birdCount: 48,
    production: { eggs: 44, small: 1, jumbo: 2, dirty: 1, cracked: 1, bloodSpot: 0, abnormal: 0 },
  };
  const b07: ReportCage = {
    cageId: '9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44',
    code: 'B-07',
    battery: 'B',
    number: 7,
    birdCount: 50,
    production: { eggs: 45, small: 0, jumbo: 1, dirty: 1, cracked: 2, bloodSpot: 1, abnormal: 0 },
  };
  const report: DailyReport = {
    id: reportId,
    sector: { id: sectorId, name: 'Codornas — Galpão 4', status: 'ACTIVE' },
    collectionDate: '2026-09-24',
    collectionTime: '06:30',
    openingBirdCount: 98,
    flockAge: 20,
    noMortalityConfirmed: false,
    openedBy: { id: '1e3a5c7b-9d1f-4b3d-8e5a-7c9e1a3b5d77', name: 'Marina Alves' },
    openedAt: '2026-09-24T09:31:40Z',
    production: { status: 'COMPLETE', pendingCages: 0, collectedEggs: 89, standardEggs: 79, unsellableEggs: 4, layingRate: 90.82 },
    mortality: { status: 'PENDING', deaths: 0, culls: 0, removalRate: 0, closingBirdCount: 98 },
    cages: [a01, b07],
  };

  let fixture: ComponentFixture<ProductionTabPage>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function rows(): HTMLTableRowElement[] {
    return Array.from(element().querySelectorAll<HTMLTableRowElement>('tbody tr'));
  }

  function summary(): string {
    return element().querySelector('.summary')?.textContent ?? '';
  }

  async function render(shown: DailyReport = report): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ProductionTabPage],
      providers: [provideRouter([]), ReportView],
    }).compileComponents();
    TestBed.inject(ReportView).report.set(shown);
    fixture = TestBed.createComponent(ProductionTabPage);
    document.body.appendChild(element());
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => element()?.remove());

  it('shows the eggs of the day with the cages, the laying rate over the birds, the standard and the unsellable eggs', async () => {
    await render();

    expect(summary()).toContain('Ovos coletados');
    expect(summary()).toContain('89');
    expect(summary()).toContain('2 gaiolas');
    expect(summary()).toContain('90,82%');
    expect(summary()).toContain('ovos ÷ 98 aves');
    expect(summary()).toContain('Padrão');
    expect(summary()).toContain('79');
    expect(summary()).toContain('Não comercializáveis');
    expect(summary()).toContain('trincados, com sangue e anormais');
  });

  it('names the edit icon of the hint for the screen reader', async () => {
    await render();

    expect(element().querySelector('.hint')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Toque em editar para lançar ou corrigir uma gaiola',
    );
  });

  it('shows each cage with its birds, its eggs and the six grades', async () => {
    await render();

    const cells = Array.from(rows()[1].querySelectorAll('td')).map((cell) => cell.textContent?.trim());
    expect(cells[0]).toContain('B-07');
    expect(cells[0]).toContain('50 aves');
    expect(cells.slice(1, 8)).toEqual(['45', '0', '1', '1', '2', '1', '0']);
  });

  it('dims the zeros', async () => {
    await render();

    const zeros = rows()[1].querySelectorAll('.zero');
    expect(Array.from(zeros).map((zero) => zero.textContent?.trim())).toEqual(['0', '0']);
  });

  it('says which cages have no production yet', async () => {
    await render({
      ...report,
      production: { ...report.production, status: 'PENDING', pendingCages: 1, collectedEggs: 45 },
      cages: [{ ...a01, production: undefined }, b07],
    });

    expect(rows()[0].textContent).toContain('Não lançada');
    expect(rows()[1].textContent).not.toContain('Não lançada');
  });

  it('filters the table by the battery, and keeps the totals of the day', async () => {
    await render();

    Array.from(element().querySelectorAll<HTMLButtonElement>('.seg button'))
      .find((button) => button.textContent?.trim() === 'B')!
      .click();
    fixture.detectChanges();

    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('B-07');
    expect(summary()).toContain('89');
  });

  it('leads each cage to the dialog that records or corrects its production', async () => {
    await render({ ...report, cages: [{ ...a01, production: undefined }, b07] });

    const record = element().querySelector<HTMLAnchorElement>('[aria-label="Lançar produção da gaiola A-01"]');
    const correct = element().querySelector<HTMLAnchorElement>('[aria-label="Corrigir produção da gaiola B-07"]');
    expect(record?.getAttribute('href')).toBe(`/setores/${sectorId}/relatorios/${reportId}/producao/${a01.cageId}`);
    expect(correct?.getAttribute('href')).toBe(`/setores/${sectorId}/relatorios/${reportId}/producao/${b07.cageId}`);
  });

  it('follows the report of the page when it is loaded again', async () => {
    await render({ ...report, cages: [{ ...a01, production: undefined }, b07] });

    TestBed.inject(ReportView).report.set(report);
    fixture.detectChanges();

    expect(rows()[0].textContent).not.toContain('Não lançada');
    expect(rows()[0].textContent).toContain('44');
  });

  it('keeps the production of an inactive sector for consultation only', async () => {
    await render({ ...report, sector: { ...report.sector, status: 'INACTIVE' } });

    expect(element().querySelector('[aria-label^="Corrigir produção"]')).toBeNull();
    expect(rows()).toHaveLength(2);
  });
});
