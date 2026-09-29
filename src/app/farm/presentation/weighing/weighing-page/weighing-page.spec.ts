import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { failure, success } from '../../../../shared/application/result';
import { Notification } from '../../../../shared/domain/notification';
import { GetWeighingOverviewUseCase } from '../../../application/weighing/get-weighing-overview.usecase';
import { VoidWeighingUseCase } from '../../../application/weighing/void-weighing.usecase';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { WeighingOverview } from '../../../domain/weighing';
import { WeighingChanges } from '../weighing-changes';
import { WeighingPage } from './weighing-page';

/**
 * A tela Peso médio da gaiola (US1 e US3 da 005; FR-009 a FR-013): o histórico das pesagens com a variação
 * de uma semana para a outra, e o registro de uma pesagem nova.
 */
describe('WeighingPage', () => {
  const sectorId = '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11';
  const cageId = '2a4c6e8a-0b1d-4f3a-9c5e-7a9b1d3f5a66';
  const marina = { id: '5e7a9c1e-3b5d-4f7a-9c1e-3b5d7f9a1c22', name: 'Marina Alves' };
  const overview: WeighingOverview = {
    cage: { id: cageId, code: 'A-01', battery: 'A', number: 1, birdCount: 48, status: 'ACTIVE' },
    sector: { id: sectorId, name: 'Codornas — Galpão 1', status: 'ACTIVE' },
    latest: { id: 'w-24', weighedOn: '2026-09-24', averageWeight: 161.4 },
    chart: [],
    history: [
      {
        id: 'w-24',
        weighedOn: '2026-09-24',
        averageWeight: 161.4,
        change: 3.4,
        recordedBy: marina,
      },
      { id: 'w-17', weighedOn: '2026-09-17', averageWeight: 158, change: -1.5, recordedBy: marina },
      { id: 'w-10', weighedOn: '2026-09-10', averageWeight: 159.5, recordedBy: marina },
    ],
  };

  let find: Mock;
  let voidWeighing: Mock;
  let fixture: ComponentFixture<WeighingPage>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [WeighingPage],
      providers: [
        provideRouter([]),
        { provide: GetWeighingOverviewUseCase, useValue: { execute: find } },
        { provide: VoidWeighingUseCase, useValue: { execute: voidWeighing } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ sectorId, cageId }) } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(WeighingPage);
    document.body.appendChild(element());
    fixture.detectChanges();
    await settle();
  }

  beforeEach(() => {
    find = vi.fn().mockResolvedValue(success(overview));
    voidWeighing = vi.fn().mockResolvedValue(success(undefined));
  });

  afterEach(() => element()?.remove());

  function link(text: string): HTMLAnchorElement | undefined {
    return Array.from(element().querySelectorAll<HTMLAnchorElement>('a')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  }

  function column(label: string): readonly string[] {
    return Array.from(element().querySelectorAll(`tbody td[data-label="${label}"]`)).map(
      (cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );
  }

  it('asks for the overview of the cage of the address', async () => {
    await render();

    expect(find).toHaveBeenCalledWith(sectorId, cageId);
  });

  it('names the page after the cage and its sector, with the way back to the cages', async () => {
    await render();

    expect(element().querySelector('h1')?.textContent?.trim()).toBe('Peso médio');
    expect(element().textContent).toContain('Codornas — Galpão 1 · Gaiola A-01');
    expect(link('Voltar às gaiolas')?.getAttribute('href')).toBe(`/setores/${sectorId}/gaiolas`);
  });

  it('lists the history from the most recent, with the weight and the change of each week', async () => {
    await render();

    expect(column('Data')).toEqual(['24/09/2026', '17/09/2026', '10/09/2026']);
    expect(column('Peso médio')).toEqual(['161,4 g', '158 g', '159,5 g']);
    expect(column('Δ semana')).toEqual(['+3,4 g', '−1,5 g', '—']);
  });

  it('highlights the week in which the cage lost weight', async () => {
    await render();

    const cells = element().querySelectorAll('tbody td[data-label="Δ semana"]');
    expect(cells[1].querySelector('.delta.bad')).not.toBeNull();
    expect(cells[0].querySelector('.delta.bad')).toBeNull();
  });

  it('offers to record a weighing, to any caretaker, in an active cage', async () => {
    await render();

    expect(link('Registrar pesagem')?.getAttribute('href')).toBe(
      `/setores/${sectorId}/gaiolas/${cageId}/peso/nova`,
    );
  });

  it('only shows the weighings of an inactive cage, and says so', async () => {
    find.mockResolvedValue(
      success({ ...overview, cage: { ...overview.cage, status: 'INACTIVE' } }),
    );

    await render();

    expect(link('Registrar pesagem')).toBeUndefined();
    expect(element().textContent).toContain(
      'A gaiola está inativa; as pesagens dela são só para consulta.',
    );
  });

  it('only shows the weighings of a cage of an inactive sector, and says so', async () => {
    find.mockResolvedValue(
      success({ ...overview, sector: { ...overview.sector, status: 'INACTIVE' } }),
    );

    await render();

    expect(link('Registrar pesagem')).toBeUndefined();
    expect(element().textContent).toContain(
      'O setor está inativo; as pesagens da gaiola são só para consulta.',
    );
  });

  it('says the cage was not found', async () => {
    find.mockResolvedValue(
      failure(Notification.of([{ code: 'CAGE_NOT_FOUND', message: 'Gaiola não encontrada.' }])),
    );

    await render();

    expect(element().querySelector('ovyx-alert')?.textContent).toContain('Gaiola não encontrada.');
    expect(element().querySelector('table')).toBeNull();
  });

  it('asks for the overview again when a weighing changes', async () => {
    await render();

    TestBed.inject(WeighingChanges).notify();
    await settle();

    expect(find).toHaveBeenCalledTimes(2);
  });

  // ---------------------------------------------------------------- acompanhamento (US3)

  const followed: WeighingOverview = {
    ...overview,
    sector: { ...overview.sector, referenceWeight: { minimum: 155, maximum: 175 } },
    fourWeekChange: { change: 11.4, since: '2026-08-27' },
    rangeStatus: 'WITHIN',
    chart: [
      { weighedOn: '2026-08-27', averageWeight: 150 },
      { weighedOn: '2026-09-03', averageWeight: 153 },
      { weighedOn: '2026-09-10', averageWeight: 159.5 },
      { weighedOn: '2026-09-17', averageWeight: 158 },
      { weighedOn: '2026-09-24', averageWeight: 161.4 },
    ],
  };

  function summaryItem(label: string): HTMLElement | undefined {
    return Array.from(element().querySelectorAll<HTMLElement>('.summary [role="listitem"]')).find(
      (item) => item.querySelector('span')?.textContent?.trim() === label,
    );
  }

  it('sums up the latest weighing, the change in four weeks, the birds and the situation in the range', async () => {
    find.mockResolvedValue(success(followed));

    await render();

    expect(summaryItem('Última pesagem')?.querySelector('b')?.textContent?.trim()).toBe('161,4 g');
    expect(summaryItem('Última pesagem')?.querySelector('em')?.textContent?.trim()).toBe(
      '24/09/2026',
    );
    expect(summaryItem('Variação em 4 semanas')?.querySelector('b')?.textContent?.trim()).toBe(
      '+11,4 g',
    );
    expect(summaryItem('Variação em 4 semanas')?.querySelector('em')?.textContent?.trim()).toBe(
      'desde 27/08',
    );
    expect(summaryItem('Aves na gaiola')?.querySelector('b')?.textContent?.trim()).toBe('48');
    expect(summaryItem('Aves na gaiola')?.querySelector('em')?.textContent?.trim()).toBe(
      'Bateria A',
    );
    expect(summaryItem('Situação')?.querySelector('.badge')?.textContent?.trim()).toBe(
      'Dentro da faixa',
    );
    expect(summaryItem('Situação')?.querySelector('.badge')?.getAttribute('data-tone')).toBe(
      'success',
    );
    expect(summaryItem('Situação')?.querySelector('em')?.textContent?.trim()).toBe(
      'Faixa 155–175 g',
    );
  });

  it('highlights a latest weighing out of the range', async () => {
    find.mockResolvedValue(success({ ...followed, rangeStatus: 'OUTSIDE' }));

    await render();

    expect(summaryItem('Situação')?.querySelector('.badge')?.textContent?.trim()).toBe(
      'Fora da faixa',
    );
    expect(summaryItem('Situação')?.querySelector('.badge')?.getAttribute('data-tone')).toBe(
      'warning',
    );
  });

  it('says the sector has no range, and leaves the change in four weeks as not calculated', async () => {
    find.mockResolvedValue(
      success({
        ...followed,
        sector: overview.sector,
        rangeStatus: 'NO_RANGE',
        fourWeekChange: undefined,
      }),
    );

    await render();

    expect(summaryItem('Situação')?.querySelector('b')?.textContent?.trim()).toBe(
      'Sem faixa definida',
    );
    expect(summaryItem('Variação em 4 semanas')?.querySelector('b')?.textContent?.trim()).toBe('—');
    expect(summaryItem('Variação em 4 semanas')?.querySelector('em')?.textContent?.trim()).toBe(
      'sem pesagem de 4 semanas antes',
    );
  });

  it('charts the evolution of the weight, with the range of the sector', async () => {
    find.mockResolvedValue(success(followed));

    await render();

    const chart = element().querySelector('ovyx-line-chart')!;
    expect(chart.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Evolução do peso médio da gaiola A-01, de 150 g em 27/08/2026 a 161,4 g em 24/09/2026',
    );
    expect(chart.querySelectorAll('[data-day]')).toHaveLength(5);
    expect(chart.textContent).toContain('Faixa ideal 155–175 g');
    expect(element().textContent).toContain('Últimas 5 pesagens');
  });

  it('invites to record the first weighing of a cage never weighed, without chart nor table', async () => {
    find.mockResolvedValue(success({ ...overview, latest: undefined, history: [], chart: [] }));

    await render();

    expect(element().querySelector('.empty h2')?.textContent?.trim()).toBe(
      'Nenhuma pesagem registrada',
    );
    expect(element().querySelector('.empty')?.textContent).toContain(
      'Pese uma amostra de aves e registre a média para acompanhar a curva da gaiola A-01.',
    );
    expect(element().querySelector('.empty a')?.getAttribute('href')).toBe(
      `/setores/${sectorId}/gaiolas/${cageId}/peso/nova`,
    );
    expect(element().querySelector('ovyx-line-chart')).toBeNull();
    expect(element().querySelector('table')).toBeNull();
    expect(element().querySelector('.summary')).toBeNull();
  });

  // ---------------------------------------------------------------- correção e exclusão (US4)

  function named(label: string): HTMLElement | null {
    return element().querySelector<HTMLElement>(`[aria-label="${label}"]`);
  }

  function confirmation(): HTMLElement | null {
    return element().querySelector<HTMLElement>('[role="alertdialog"]');
  }

  function buttonIn(root: ParentNode, text: string): HTMLButtonElement {
    return Array.from(root.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    )!;
  }

  it('leads to the correction of each weighing', async () => {
    await render();

    expect(named('Corrigir pesagem de 24/09/2026')?.getAttribute('href')).toBe(
      `/setores/${sectorId}/gaiolas/${cageId}/peso/w-24`,
    );
  });

  it('asks for confirmation before excluding, saying what leaves, with the focus on cancel', async () => {
    await render();

    named('Excluir pesagem de 17/09/2026')!.click();
    fixture.detectChanges();
    await settle();

    expect(confirmation()?.textContent).toContain(
      'O peso médio de 158 g da gaiola A-01 sairá do histórico e do gráfico.',
    );
    expect(document.activeElement?.textContent?.trim()).toBe('Cancelar');
    expect(voidWeighing).not.toHaveBeenCalled();
  });

  it('excludes the weighing when confirmed, says so and reads the overview again', async () => {
    await render();
    named('Excluir pesagem de 17/09/2026')!.click();
    fixture.detectChanges();

    buttonIn(confirmation()!, 'Excluir pesagem').dispatchEvent(new Event('click'));
    await settle();
    await settle();

    expect(voidWeighing).toHaveBeenCalledWith(sectorId, cageId, 'w-17');
    expect(
      TestBed.inject(Toaster)
        .toasts()
        .map((toast) => toast.message),
    ).toContain('Pesagem de 17/09/2026 excluída.');
    expect(find).toHaveBeenCalledTimes(2);
    expect(confirmation()).toBeNull();
  });

  it('takes the focus to the correction of the row that took the place of the excluded one', async () => {
    await render();
    named('Excluir pesagem de 24/09/2026')!.click();
    fixture.detectChanges();
    find.mockResolvedValue(success({ ...overview, history: overview.history.slice(1) }));

    buttonIn(confirmation()!, 'Excluir pesagem').dispatchEvent(new Event('click'));
    await settle();
    await settle();

    expect(document.activeElement).toBe(named('Corrigir pesagem de 17/09/2026'));
  });

  it('takes the focus to the empty state when the last weighing is excluded', async () => {
    find.mockResolvedValue(success({ ...overview, history: overview.history.slice(0, 1) }));
    await render();
    named('Excluir pesagem de 24/09/2026')!.click();
    fixture.detectChanges();
    find.mockResolvedValue(success({ ...overview, latest: undefined, history: [], chart: [] }));

    buttonIn(confirmation()!, 'Excluir pesagem').dispatchEvent(new Event('click'));
    await settle();
    await settle();

    expect(document.activeElement).toBe(element().querySelector('[data-empty]'));
  });

  it('offers no correction nor exclusion in an inactive cage', async () => {
    find.mockResolvedValue(
      success({ ...overview, cage: { ...overview.cage, status: 'INACTIVE' } }),
    );

    await render();

    expect(named('Corrigir pesagem de 24/09/2026')).toBeNull();
    expect(named('Excluir pesagem de 24/09/2026')).toBeNull();
  });

  it('says the exclusion was refused, and reads the overview again when the weighing is gone', async () => {
    voidWeighing.mockResolvedValue(
      failure(
        Notification.of([{ code: 'WEIGHING_NOT_FOUND', message: 'Pesagem não encontrada.' }]),
      ),
    );
    await render();
    named('Excluir pesagem de 17/09/2026')!.click();
    fixture.detectChanges();

    buttonIn(confirmation()!, 'Excluir pesagem').dispatchEvent(new Event('click'));
    await settle();
    await settle();

    expect(element().textContent).toContain('Não foi possível excluir a pesagem:');
    expect(element().textContent).toContain('Pesagem não encontrada.');
    expect(element().textContent).not.toContain('Não foi possível carregar as pesagens:');
    expect(
      TestBed.inject(Toaster)
        .toasts()
        .map((toast) => toast.message),
    ).not.toContain('Pesagem de 17/09/2026 excluída.');
    expect(confirmation()).toBeNull();
    expect(find).toHaveBeenCalledTimes(2);
  });

  it('reads the overview again when the exclusion finds the cage inactive', async () => {
    voidWeighing.mockResolvedValue(
      failure(
        Notification.of([
          {
            code: 'CAGE_INACTIVE',
            message: 'A gaiola está inativa; as pesagens dela são só para consulta.',
          },
        ]),
      ),
    );
    await render();
    named('Excluir pesagem de 17/09/2026')!.click();
    fixture.detectChanges();

    buttonIn(confirmation()!, 'Excluir pesagem').dispatchEvent(new Event('click'));
    await settle();
    await settle();

    expect(find).toHaveBeenCalledTimes(2);
  });

  it('keeps the overview when the exclusion fails for another reason', async () => {
    voidWeighing.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'UNEXPECTED', message: 'Não foi possível falar com o servidor.' },
        ]),
      ),
    );
    await render();
    named('Excluir pesagem de 17/09/2026')!.click();
    fixture.detectChanges();

    buttonIn(confirmation()!, 'Excluir pesagem').dispatchEvent(new Event('click'));
    await settle();

    expect(element().textContent).toContain('Não foi possível falar com o servidor.');
    expect(find).toHaveBeenCalledTimes(1);
    expect(named('Excluir pesagem de 17/09/2026')).not.toBeNull();
  });

  it('says the weighings could not be loaded when the lookup fails for another reason', async () => {
    find.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'UNEXPECTED', message: 'Não foi possível falar com o servidor.' },
        ]),
      ),
    );

    await render();

    expect(element().textContent).toContain('Não foi possível carregar as pesagens:');
    expect(element().textContent).toContain('Não foi possível falar com o servidor.');
    expect(element().textContent).not.toContain('Gaiola não encontrada.');
  });
});
