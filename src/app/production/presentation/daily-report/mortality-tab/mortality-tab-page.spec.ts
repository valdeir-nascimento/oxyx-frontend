import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { Notification } from '../../../../shared/domain/notification';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { ConfirmNoMortalityUseCase } from '../../../application/daily-report/confirm-no-mortality.usecase';
import { DailyReport, ReportCage } from '../../../domain/daily-report';
import { ReportChanges } from '../report-changes';
import { ReportView } from '../report-view';
import { MortalityTabPage } from './mortality-tab-page';

/**
 * A aba de mortalidade do relatório (US3; FR-011 a FR-014): a faixa com mortes, descartes, taxa e saldo,
 * a tabela das gaiolas e a confirmação do dia sem ocorrência.
 */
describe('MortalityTabPage', () => {
  const sectorId = '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33';
  const reportId = '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55';
  const a01: ReportCage = { cageId: '2a4c6e8a-0b1d-4f3a-9c5e-7a9b1d3f5a66', code: 'A-01', battery: 'A', number: 1, birdCount: 48 };
  const b07: ReportCage = {
    cageId: '9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44',
    code: 'B-07',
    battery: 'B',
    number: 7,
    birdCount: 50,
    mortality: { deaths: 2, culls: 1, note: 'Prostração e penas eriçadas.' },
  };
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
    mortality: { status: 'RECORDED', deaths: 2, culls: 1, removalRate: 0.13, closingBirdCount: 2397 },
    cages: [a01, b07],
  };
  const withoutOccurrence: DailyReport = {
    ...report,
    mortality: { status: 'PENDING', deaths: 0, culls: 0, removalRate: 0, closingBirdCount: 2400 },
    cages: [a01, { ...b07, mortality: undefined }],
  };

  let confirm: Mock;
  let fixture: ComponentFixture<MortalityTabPage>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function rows(): HTMLTableRowElement[] {
    return Array.from(element().querySelectorAll<HTMLTableRowElement>('tbody tr'));
  }

  function button(text: string): HTMLButtonElement | undefined {
    return Array.from(element().querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(shown: DailyReport = report): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [MortalityTabPage],
      providers: [provideRouter([]), ReportView, { provide: ConfirmNoMortalityUseCase, useValue: { execute: confirm } }],
    }).compileComponents();
    TestBed.inject(ReportView).report.set(shown);
    fixture = TestBed.createComponent(MortalityTabPage);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    confirm = vi.fn().mockResolvedValue(success({ ...withoutOccurrence, noMortalityConfirmed: true }));
  });

  afterEach(() => element()?.remove());

  it('shows the deaths, the culls, the rate of the day and the balance for the next report', async () => {
    await render();

    const summary = element().querySelector('.summary')?.textContent ?? '';
    expect(summary).toContain('Mortes');
    expect(summary).toContain('aves encontradas mortas');
    expect(summary).toContain('Descartes');
    expect(summary).toContain('retiradas do plantel');
    expect(summary).toContain('0,13%');
    expect(summary).toContain('removidos ÷ aves');
    expect(summary).toContain('2.397');
    expect(summary).toContain('para o próximo relatório');
  });

  it('shows each cage with its deaths, its culls and its note, and zeros where nothing was recorded', async () => {
    await render();

    const [first, second] = rows();
    expect(second.textContent).toContain('B-07');
    expect(second.textContent).toContain('Prostração e penas eriçadas.');
    expect(Array.from(second.querySelectorAll('td')).map((cell) => cell.textContent?.trim()).slice(1, 3)).toEqual(['2', '1']);
    expect(first.querySelectorAll('.zero')).toHaveLength(2);
  });

  it('shows only the cages with an occurrence when the switch is on', async () => {
    await render();

    element().querySelector<HTMLInputElement>('.switch input')!.click();
    fixture.detectChanges();

    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('B-07');
  });

  it('filters the table by the battery', async () => {
    await render();

    Array.from(element().querySelectorAll<HTMLButtonElement>('.seg button'))
      .find((option) => option.textContent?.trim() === 'A')!
      .click();
    fixture.detectChanges();

    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('A-01');
  });

  it('says there is no occurrence when the switch is on and nothing was recorded', async () => {
    await render(withoutOccurrence);

    element().querySelector<HTMLInputElement>('.switch input')!.click();
    fixture.detectChanges();

    expect(element().querySelector('.empty')?.textContent).toContain('Nenhuma ocorrência');
    expect(rows()).toHaveLength(0);
  });

  it('leads each cage to the dialog that records or corrects its mortality', async () => {
    await render();

    expect(element().querySelector('[aria-label="Lançar mortalidade da gaiola A-01"]')?.getAttribute('href')).toBe(
      `/setores/${sectorId}/relatorios/${reportId}/mortalidade/${a01.cageId}`,
    );
    expect(element().querySelector('[aria-label="Corrigir mortalidade da gaiola B-07"]')).not.toBeNull();
  });

  it('offers to confirm the day only without occurrence and without confirmation', async () => {
    await render();

    expect(button('Confirmar dia sem ocorrência')).toBeUndefined();
  });

  it('confirms the day without occurrence, in a toast, and tells the report', async () => {
    await render(withoutOccurrence);

    button('Confirmar dia sem ocorrência')!.click();
    await settle();

    expect(confirm).toHaveBeenCalledWith(sectorId, reportId);
    expect(TestBed.inject(Toaster).toasts().map((toast) => toast.message)).toEqual([
      'Mortalidade de 24/09/2026 confirmada sem ocorrência.',
    ]);
    expect(TestBed.inject(ReportChanges).version()).toBe(1);
  });

  it('says the day is confirmed, and does not offer to confirm it again', async () => {
    await render({ ...withoutOccurrence, noMortalityConfirmed: true, mortality: { ...withoutOccurrence.mortality, status: 'RECORDED' } });

    expect(element().textContent).toContain('Dia confirmado sem ocorrência');
    expect(button('Confirmar dia sem ocorrência')).toBeUndefined();
  });

  it('shows the refusal of an occurrence recorded meanwhile, and asks for the report again', async () => {
    confirm.mockResolvedValue(
      failure(
        Notification.of([{ code: 'MORTALITY_ALREADY_RECORDED', message: 'O relatório já tem mortes ou descartes lançados.' }]),
      ),
    );
    await render(withoutOccurrence);

    button('Confirmar dia sem ocorrência')!.click();
    await settle();

    expect(element().textContent).toContain('O relatório já tem mortes ou descartes lançados.');
    expect(TestBed.inject(ReportChanges).version()).toBe(1);
  });

  it('keeps the mortality of an inactive sector for consultation only', async () => {
    await render({ ...withoutOccurrence, sector: { ...report.sector, status: 'INACTIVE' } });

    expect(element().querySelector('[aria-label^="Lançar mortalidade"]')).toBeNull();
    expect(button('Confirmar dia sem ocorrência')).toBeUndefined();
  });
});
