import type { Mock } from 'vitest';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { VIEWER } from '../../../../shared/application/viewer';
import { Notification } from '../../../../shared/domain/notification';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { ListActiveFormulasUseCase } from '../../../application/daily-report/list-active-formulas.usecase';
import { RecordFeedBySuggestionUseCase } from '../../../application/daily-report/record-feed-by-suggestion.usecase';
import { SuggestFeedUseCase } from '../../../application/daily-report/suggest-feed.usecase';
import {
  DailyReport,
  FeedFormulaOption,
  FeedSuggestion,
  ReportCage,
} from '../../../domain/daily-report';
import { ReportChanges } from '../report-changes';
import { ReportView } from '../report-view';
import { FeedTabPage } from './feed-tab-page';

/**
 * A aba Ração do relatório (US2 da 004; FR-007 a FR-009, FR-012 a FR-014; R-013): a faixa com o consumo,
 * o custo e o custo por ovo do dia, a tabela com a ração de cada gaiola e, com gaiolas pendentes, o
 * lançamento do setor pela sugestão de uma fórmula ativa.
 */
describe('FeedTabPage', () => {
  const sectorId = '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33';
  const reportId = '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55';
  const posturaPlus: FeedFormulaOption = {
    id: '4e6a8c0e-2a4c-4e6a-9c0e-2a4c6e8a0c11',
    name: 'Postura Plus',
    pricePerKg: 2.85,
    expectedIntake: 28,
  };
  const recria: FeedFormulaOption = {
    id: '8a0c2e4a-6c8e-4a0c-8e2a-4c6e8a0c2e22',
    name: 'Recria',
    pricePerKg: 3.1,
    expectedIntake: 24,
  };
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
  const pending: DailyReport = {
    id: reportId,
    sector: { id: sectorId, name: 'Codornas — Galpão 4', status: 'ACTIVE' },
    collectionDate: '2026-09-24',
    collectionTime: '06:30',
    openingBirdCount: 98,
    flockAge: 20,
    noMortalityConfirmed: false,
    openedBy: { id: '1e3a5c7b-9d1f-4b3d-8e5a-7c9e1a3b5d77', name: 'Marina Alves' },
    openedAt: '2026-09-24T09:31:40Z',
    production: {
      status: 'COMPLETE',
      pendingCages: 0,
      collectedEggs: 89,
      standardEggs: 79,
      unsellableEggs: 4,
      layingRate: 90.82,
    },
    mortality: { status: 'PENDING', deaths: 0, culls: 0, removalRate: 0, closingBirdCount: 98 },
    feed: { status: 'PENDING', pendingCages: 2, consumption: 0, cost: 0 },
    cages: [a01, b07],
  };
  const fedWith = (cage: ReportCage, consumption: number, cost: number): ReportCage => ({
    ...cage,
    feed: {
      formulaId: posturaPlus.id,
      formulaName: 'Postura Plus',
      pricePerKg: 2.85,
      expectedIntake: 28,
      consumption,
      cost,
      intakePerBird: 28,
      deviation: 0,
    },
  });
  const fed: DailyReport = {
    ...pending,
    feed: {
      status: 'COMPLETE',
      pendingCages: 0,
      consumption: 2744,
      cost: 7.82,
      costPerEgg: 0.088,
      intakePerBird: 28,
      expectedIntakePerBird: 28,
    },
    cages: [fedWith(a01, 1344, 3.83), fedWith(b07, 1400, 3.99)],
  };
  const suggestion: FeedSuggestion = {
    formula: posturaPlus,
    cages: [
      { cageId: a01.cageId, code: 'A-01', birdCount: 48, consumption: 1344, cost: 3.83 },
      { cageId: b07.cageId, code: 'B-07', birdCount: 50, consumption: 1400, cost: 3.99 },
    ],
    totals: fed.feed,
  };

  let listFormulas: Mock;
  let suggest: Mock;
  let record: Mock;
  let fixture: ComponentFixture<FeedTabPage>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function summary(): string {
    return element().querySelector('.summary')?.textContent?.replace(/\s+/g, ' ') ?? '';
  }

  function row(code: string): HTMLElement {
    return Array.from(element().querySelectorAll<HTMLElement>('tbody tr')).find(
      (candidate) => candidate.querySelector('b')?.textContent?.trim() === code,
    )!;
  }

  function cell(code: string, label: string): string {
    return (
      row(code)
        .querySelector(`td[data-label="${label}"]`)
        ?.textContent?.replace(/\s+/g, ' ')
        .trim() ?? ''
    );
  }

  function button(text: string): HTMLButtonElement | undefined {
    return Array.from(element().querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  }

  function formulaSelect(): HTMLSelectElement | null {
    return element().querySelector<HTMLSelectElement>('select#sectorFormulaId');
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function choose(formulaId: string): Promise<void> {
    const select = formulaSelect()!;
    select.value = formulaId;
    select.dispatchEvent(new Event('change'));
    await settle();
  }

  function toasts(): readonly string[] {
    return TestBed.inject(Toaster)
      .toasts()
      .map((toast) => toast.message);
  }

  async function render(shown: DailyReport = pending, administrator = false): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [FeedTabPage],
      providers: [
        provideRouter([]),
        ReportView,
        { provide: ListActiveFormulasUseCase, useValue: { execute: listFormulas } },
        { provide: SuggestFeedUseCase, useValue: { execute: suggest } },
        { provide: RecordFeedBySuggestionUseCase, useValue: { execute: record } },
        { provide: VIEWER, useValue: { isAdministrator: signal(administrator) } },
      ],
    }).compileComponents();
    TestBed.inject(ReportView).report.set(shown);
    fixture = TestBed.createComponent(FeedTabPage);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    listFormulas = vi.fn().mockResolvedValue(success([posturaPlus, recria]));
    suggest = vi.fn().mockResolvedValue(success(suggestion));
    record = vi.fn().mockResolvedValue(success(fed));
  });

  afterEach(() => element()?.remove());

  it('shows the consumption of the day in kilos, its cost, the cost per egg and the intake per bird against the expected', async () => {
    await render(fed);

    expect(summary()).toContain('Consumo total');
    expect(summary()).toContain('2,7 kg');
    expect(summary()).toContain('2 gaiolas');
    expect(summary()).toContain('Custo da ração');
    expect(summary()).toContain('R$ 7,82');
    expect(summary()).toContain('Custo por ovo');
    expect(summary()).toContain('R$ 0,088');
    expect(summary()).toContain('89 ovos');
    expect(summary()).toContain('Consumo por ave');
    expect(summary()).toContain('28,0 g');
    expect(summary()).toContain('esperado 28,0 g por ave ao dia');
  });

  it('shows each fed cage with its formula and the price kept, its consumption, its intake per bird and its cost', async () => {
    await render(fed);

    expect(cell('B-07', 'Fórmula')).toBe('Postura Plus R$ 2,85/kg');
    expect(cell('B-07', 'Consumo')).toBe('1.400 g');
    expect(cell('B-07', 'Por ave')).toBe('28,0 g');
    expect(cell('B-07', 'Custo')).toBe('R$ 3,99');
    expect(row('B-07').textContent).toContain('50 aves');
  });

  it('marks the cages without feed as not recorded', async () => {
    await render();

    expect(cell('A-01', 'Consumo')).toBe('Não lançada');
    expect(cell('A-01', 'Custo')).toBe('—');
  });

  it('offers the feed of the sector, with the pending cages, among the active formulas only', async () => {
    await render();

    expect(listFormulas).toHaveBeenCalled();
    expect(element().textContent).toContain('Ração pendente em 2 gaiolas');
    const options = Array.from(formulaSelect()!.options).map((option) =>
      option.textContent?.trim(),
    );
    expect(options).toEqual([
      'Escolha a fórmula',
      'Postura Plus · R$ 2,85/kg',
      'Recria · R$ 3,10/kg',
    ]);
    expect(button('Confirmar lançamento')).toBeUndefined();
  });

  it('shows the proposal in the pending rows, marked as suggested, with the totals of the day with it', async () => {
    await render();

    await choose(posturaPlus.id);

    expect(suggest).toHaveBeenCalledWith(sectorId, reportId, posturaPlus.id);
    expect(cell('A-01', 'Consumo')).toBe('1.344 g sugerido');
    expect(row('A-01').querySelector('.badge.b-info')?.textContent?.trim()).toBe('sugerido');
    expect(cell('A-01', 'Fórmula')).toContain('Postura Plus');
    expect(cell('A-01', 'Custo')).toBe('R$ 3,83');
    expect(summary()).toContain('2,7 kg');
    expect(summary()).toContain('R$ 7,82');
    expect(button('Confirmar lançamento')).toBeTruthy();
  });

  it('records the feed of the sector when confirmed, says so in a toast and tells the page', async () => {
    await render();
    await choose(posturaPlus.id);

    button('Confirmar lançamento')!.click();
    await settle();

    expect(record).toHaveBeenCalledWith(sectorId, reportId, posturaPlus.id);
    expect(toasts()).toEqual(['Ração de 24/09/2026 lançada.']);
    expect(TestBed.inject(ReportChanges).version()).toBe(1);
  });

  it('shows the refusal of the feed and keeps the proposal off the table', async () => {
    record.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'formulaId',
            message: 'A fórmula Postura Plus está inativa. Escolha uma fórmula ativa.',
          },
        ]),
      ),
    );
    await render();
    await choose(posturaPlus.id);

    button('Confirmar lançamento')!.click();
    await settle();

    expect(element().querySelector('ovyx-error-summary')?.textContent).toContain(
      'A fórmula Postura Plus está inativa. Escolha uma fórmula ativa.',
    );
    expect(toasts()).toEqual([]);
  });

  it('shows the refusal of the suggestion', async () => {
    suggest.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'formulaId',
            message:
              'A proposta da gaiola A-01 passaria de 50.000 g. Lance a ração dela pela própria gaiola.',
          },
        ]),
      ),
    );
    await render();

    await choose(posturaPlus.id);

    expect(element().querySelector('ovyx-error-summary')?.textContent).toContain(
      'passaria de 50.000 g',
    );
    expect(button('Confirmar lançamento')).toBeUndefined();
    expect(cell('A-01', 'Consumo')).toBe('Não lançada');
  });

  it('offers no feed of the sector when every cage is fed', async () => {
    await render(fed);

    expect(formulaSelect()).toBeNull();
    expect(listFormulas).not.toHaveBeenCalled();
  });

  it('tells an administrator there is no active formula, with the way to the formulas', async () => {
    listFormulas.mockResolvedValue(success([]));

    await render(pending, true);

    expect(element().textContent).toContain('Nenhuma fórmula ativa para lançar a ração.');
    expect(element().querySelector('a[href="/formulas"]')?.textContent?.trim()).toBe(
      'Cadastrar fórmula',
    );
    expect(formulaSelect()).toBeNull();
  });

  it('tells a common user there is no active formula, without the way to the formulas', async () => {
    listFormulas.mockResolvedValue(success([]));

    await render();

    expect(element().textContent).toContain('Peça ao administrador para cadastrar uma fórmula.');
    expect(element().querySelector('a[href="/formulas"]')).toBeNull();
  });

  it('only shows the feed in an inactive sector', async () => {
    await render({ ...pending, sector: { ...pending.sector, status: 'INACTIVE' } });

    expect(formulaSelect()).toBeNull();
    expect(listFormulas).not.toHaveBeenCalled();
    expect(cell('A-01', 'Consumo')).toBe('Não lançada');
  });

  it('leads from each cage to its feed, launching the pending one and correcting the fed one (004, US3)', async () => {
    await render({ ...fed, cages: [a01, fed.cages[1]] });

    const launch = element().querySelector<HTMLAnchorElement>(
      'a[aria-label="Lançar ração da gaiola A-01"]',
    );
    const correct = element().querySelector<HTMLAnchorElement>(
      'a[aria-label="Corrigir ração da gaiola B-07"]',
    );
    expect(launch?.getAttribute('href')).toBe(
      `/setores/${sectorId}/relatorios/${reportId}/racao/${a01.cageId}`,
    );
    expect(correct?.getAttribute('href')).toBe(
      `/setores/${sectorId}/relatorios/${reportId}/racao/${b07.cageId}`,
    );
  });

  it('offers no action on a cage of an inactive sector', async () => {
    await render({ ...fed, sector: { ...fed.sector, status: 'INACTIVE' } });

    expect(element().querySelector('a[aria-label^="Corrigir ração"]')).toBeNull();
  });

  // ---------------------------------------------------------------- US4: consumo e custo do dia

  /** A B-07 lançada com o desvio dado sobre o esperado. */
  function withDeviationOfB07(deviation: number, intakePerBird: number): DailyReport {
    const b07Fed = fed.cages[1];
    return {
      ...fed,
      cages: [fed.cages[0], { ...b07Fed, feed: { ...b07Fed.feed!, intakePerBird, deviation } }],
    };
  }

  it('highlights a cage that eats more than 2.5% below the expected, with the deviation (004, US4)', async () => {
    await render(withDeviationOfB07(-10.7, 25));

    expect(cell('B-07', 'Por ave')).toBe('25,0 g desvio de −10,7%');
    expect(
      row('B-07').querySelector('.badge.b-info')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('desvio de −10,7%');
    expect(row('A-01').querySelector('.badge')).toBeNull();
  });

  it('highlights a cage that eats more than 2.5% above the expected', async () => {
    await render(withDeviationOfB07(3.1, 28.9));

    expect(
      row('B-07').querySelector('.badge.b-warning')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('desvio de +3,1%');
  });

  it('does not highlight a deviation of 2.5% or less', async () => {
    await render(withDeviationOfB07(-2.5, 27.3));

    expect(cell('B-07', 'Por ave')).toBe('27,3 g');
    expect(row('B-07').querySelector('.badge')).toBeNull();
  });

  it('leaves the intake per bird out of a cage without birds', async () => {
    const b07Fed = fed.cages[1];
    await render({
      ...fed,
      cages: [
        fed.cages[0],
        {
          ...b07Fed,
          birdCount: 0,
          feed: { ...b07Fed.feed!, intakePerBird: undefined, deviation: undefined },
        },
      ],
    });

    expect(cell('B-07', 'Por ave')).toBe('—');
  });

  it('leaves the cost per egg out without eggs', async () => {
    await render({
      ...fed,
      production: { ...fed.production, collectedEggs: 0 },
      feed: { ...fed.feed, costPerEgg: undefined },
    });

    expect(summary()).toContain('Custo por ovo—sem ovo coletado');
  });

  it('warns the cost per egg is partial while the production of the day is not complete', async () => {
    await render({ ...fed, production: { ...fed.production, status: 'PENDING', pendingCages: 1 } });

    expect(element().textContent).toContain(
      'A produção do dia ainda não está completa: o custo por ovo muda quando ela for lançada.',
    );
  });

  it('says nothing about the production when it is complete', async () => {
    await render(fed);

    expect(element().textContent).not.toContain('A produção do dia ainda não está completa');
  });

  // ---------------------------------------------------------------- revisão 3 (T056)

  function label(): string | null | undefined {
    return element().querySelector('.summary')?.getAttribute('aria-label');
  }

  it('drops a proposal asked while the feed of the sector was being recorded', async () => {
    let answerTheRecord: (value: unknown) => void = () => undefined;
    let answerTheProposal: (value: unknown) => void = () => undefined;
    record.mockImplementationOnce(() => new Promise((resolve) => (answerTheRecord = resolve)));
    await render();
    await choose(posturaPlus.id);
    suggest.mockImplementationOnce(() => new Promise((resolve) => (answerTheProposal = resolve)));

    button('Confirmar lançamento')!.click();
    await choose(recria.id);
    answerTheRecord(success(fed));
    await settle();
    answerTheProposal(success({ ...suggestion, formula: recria }));
    await settle();

    expect(label()).toBe('Totais de ração do dia');
    expect(button('Confirmar lançamento')).toBeUndefined();
  });

  it('drops a proposal still on its way when every cage got feed meanwhile', async () => {
    let answerTheProposal: (value: unknown) => void = () => undefined;
    suggest.mockImplementationOnce(() => new Promise((resolve) => (answerTheProposal = resolve)));
    await render();
    await choose(posturaPlus.id);

    TestBed.inject(ReportView).report.set(fed);
    fixture.detectChanges();
    await settle();
    answerTheProposal(success(suggestion));
    await settle();

    expect(label()).toBe('Totais de ração do dia');
    expect(element().querySelector('tbody')?.textContent).not.toContain('sugerido');
  });

  it('takes the refusal of the proposal away when the sector no longer offers it', async () => {
    suggest.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'formulaId',
            message: 'A proposta da gaiola A-01 passaria de 50.000 g. Lance a ração dela pela própria gaiola.',
          },
        ]),
      ),
    );
    await render();
    await choose(posturaPlus.id);

    TestBed.inject(ReportView).report.set(fed);
    fixture.detectChanges();
    await settle();

    expect(element().querySelector('ovyx-error-summary')).toBeNull();
  });

  it('writes the refusal as text, and not as a link, when there is no formula to choose', async () => {
    record.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'formulaId',
            message: 'A fórmula Postura Plus está inativa. Escolha uma fórmula ativa.',
          },
        ]),
      ),
    );
    await render();
    await choose(posturaPlus.id);
    listFormulas.mockResolvedValue(success([]));

    button('Confirmar lançamento')!.click();
    await settle();

    expect(element().querySelector('ovyx-error-summary')?.textContent).toContain('está inativa');
    expect(element().querySelector('ovyx-error-summary a')).toBeNull();
  });

  // ---------------------------------------------------------------- revisão 2 (T056)

  it('asks for the proposal again when the report changes with it on the table', async () => {
    await render();
    await choose(posturaPlus.id);

    TestBed.inject(ReportView).report.set({
      ...pending,
      feed: { ...pending.feed, pendingCages: 1 },
      cages: [fedWith(a01, 1300, 3.71), pending.cages[1]],
    });
    fixture.detectChanges();
    await settle();

    expect(suggest).toHaveBeenCalledTimes(2);
    expect(suggest).toHaveBeenLastCalledWith(pending.sector.id, pending.id, posturaPlus.id);
    expect(formulaSelect()!.value).toBe(posturaPlus.id);
  });

  it('shows the totals of the report, and no proposal, when every cage got feed with the proposal on the table', async () => {
    await render();
    await choose(posturaPlus.id);

    TestBed.inject(ReportView).report.set(fed);
    fixture.detectChanges();
    await settle();

    expect(element().querySelector('.summary')?.getAttribute('aria-label')).toBe('Totais de ração do dia');
    expect(element().querySelector('[data-feed-status]')?.textContent?.trim()).toBe('');
    expect(element().querySelector('tbody')?.textContent).not.toContain('sugerido');
    expect(formulaSelect()).toBeNull();
    expect(suggest).toHaveBeenCalledTimes(1);
  });

  it('gives the formula of the sector an id of its own, apart from the formula of the cage dialog', async () => {
    await render();

    expect(element().querySelector('#formulaId')).toBeNull();
    expect(formulaSelect()!.labels?.[0]?.textContent).toContain('Fórmula do setor');
  });

  // ---------------------------------------------------------------- revisão 1 (T056)

  it('says the cost per egg waits for the feed, and not for the eggs, while no cage has feed (QA 1)', async () => {
    await render();

    expect(summary()).toContain('Custo por ovo—sem ração lançada');
    expect(summary()).not.toContain('R$ 0,000');
  });

  function status(): string {
    return element().querySelector('[data-feed-status]')?.textContent?.trim() ?? '';
  }

  it('filters the table by the battery, and keeps the totals of the day', async () => {
    await render(fed);

    Array.from(element().querySelectorAll<HTMLButtonElement>('.seg button'))
      .find((candidate) => candidate.textContent?.trim() === 'B')!
      .click();
    fixture.detectChanges();

    expect(element().querySelectorAll('tbody tr')).toHaveLength(1);
    expect(row('B-07')).toBeTruthy();
    expect(summary()).toContain('2,7 kg');
  });

  it('keeps the choice of the formula out of the notice, which only speaks', async () => {
    await render();

    expect(formulaSelect()!.closest('ovyx-alert')).toBeNull();
    expect(element().querySelector('ovyx-alert[data-feed-suggestion]')?.textContent).toContain(
      'Ração pendente em 2 gaiolas.',
    );
  });

  it('says the totals are those of the proposal while it is on the table, and announces it', async () => {
    await render();

    await choose(posturaPlus.id);

    expect(element().querySelector('.summary')?.getAttribute('aria-label')).toBe(
      'Totais de ração do dia com a proposta',
    );
    expect(status()).toBe('Proposta com a Postura Plus em 2 gaiolas.');
  });

  it('takes the proposal off the table, and the refusal with it, when the choice is undone', async () => {
    suggest.mockResolvedValueOnce(
      failure(
        Notification.of([
          { code: 'VALIDATION_FAILED', field: 'formulaId', message: 'Fórmula não encontrada.' },
        ]),
      ),
    );
    await render();
    await choose(recria.id);

    await choose('');

    expect(element().querySelector('ovyx-error-summary')).toBeNull();
    expect(cell('A-01', 'Consumo')).toBe('Não lançada');
    expect(button('Confirmar lançamento')).toBeUndefined();
  });

  it('ignores the proposal of a choice that was already left behind', async () => {
    let answerTheFirst: (value: unknown) => void = () => undefined;
    suggest
      .mockImplementationOnce(() => new Promise((resolve) => (answerTheFirst = resolve)))
      .mockResolvedValueOnce(success({ ...suggestion, formula: recria }));
    await render();

    await choose(posturaPlus.id);
    await choose(recria.id);
    answerTheFirst(success(suggestion));
    await settle();

    expect(cell('A-01', 'Fórmula')).toContain('Recria');
  });

  it('shows the refusal of the formula next to the choice, and in the summary that leads to it', async () => {
    suggest.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'formulaId',
            message:
              'A proposta da gaiola A-01 passaria de 50.000 g. Lance a ração dela pela própria gaiola.',
          },
        ]),
      ),
    );
    await render();

    await choose(posturaPlus.id);

    expect(element().querySelector('#sectorFormulaId-error')?.textContent).toContain(
      'passaria de 50.000 g',
    );
    expect(formulaSelect()!.getAttribute('aria-describedby')).toBe('sectorFormulaId-error');
  });

  it('asks for another formula after a refused confirmation, with the list read again', async () => {
    record.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'VALIDATION_FAILED',
            field: 'formulaId',
            message: 'A fórmula Postura Plus está inativa. Escolha uma fórmula ativa.',
          },
        ]),
      ),
    );
    await render();
    await choose(posturaPlus.id);
    listFormulas.mockResolvedValue(success([recria]));

    button('Confirmar lançamento')!.click();
    await settle();

    expect(formulaSelect()!.value).toBe('');
    expect(listFormulas).toHaveBeenCalledTimes(2);
    expect(
      Array.from(formulaSelect()!.options).map((option) => option.textContent?.trim()),
    ).toEqual(['Escolha a fórmula', 'Recria · R$ 3,10/kg']);
  });

  it('does not say there is no active formula when the formulas could not be read', async () => {
    listFormulas.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'INTERNAL_ERROR', message: 'Não foi possível concluir a operação.' },
        ]),
      ),
    );

    await render(pending, true);

    expect(element().querySelector('ovyx-error-summary')?.textContent).toContain(
      'Não foi possível concluir a operação.',
    );
    expect(element().textContent).not.toContain('Nenhuma fórmula ativa');
    expect(formulaSelect()).toBeNull();
  });

  it('takes the focus to the table after the feed of the sector is recorded', async () => {
    await render();
    await choose(posturaPlus.id);

    button('Confirmar lançamento')!.click();
    await settle();

    expect(document.activeElement).toBe(element().querySelector('.tbl-wrap'));
  });
});
