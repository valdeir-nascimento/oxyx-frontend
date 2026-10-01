import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FarmDashboard } from '../../../domain/dashboard';
import { FarmPanel } from './farm-panel';

/**
 * O painel da granja toda (feature 009): os setores ativos somados, com os indicadores da aba de um setor e os
 * pendentes contados em relatórios.
 */
describe('FarmPanel', () => {
  const farm: FarmDashboard = {
    period: 'TODAY',
    from: '2026-09-24',
    to: '2026-09-24',
    activeSectors: 3,
    reportingSectors: 2,
    indicators: {
      production: {
        value: 2900,
        previous: 2860,
        change: 1.4,
        goodDirection: 'UP',
        incompleteDays: 0,
      },
      layingRate: {
        value: 90.63,
        previous: 89.38,
        change: 1.25,
        goodDirection: 'UP',
        incompleteDays: 0,
      },
      feedCost: {
        value: 159.6,
        previous: 277.65,
        change: -42.5,
        goodDirection: 'DOWN',
        incompleteDays: 1,
      },
      costPerEgg: {
        value: 0.092,
        previous: 0.097,
        change: -5.2,
        goodDirection: 'DOWN',
        incompleteDays: 1,
      },
    },
    trend: [
      { date: '2026-09-18', reportingSectors: 0 },
      { date: '2026-09-19', reportingSectors: 0 },
      { date: '2026-09-20', reportingSectors: 0 },
      { date: '2026-09-21', reportingSectors: 0 },
      { date: '2026-09-22', reportingSectors: 0 },
      { date: '2026-09-23', production: 2860, layingRate: 89.38, reportingSectors: 2 },
      { date: '2026-09-24', production: 2900, layingRate: 90.63, reportingSectors: 2 },
    ],
    sectors: [],
  };

  let fixture: ComponentFixture<FarmPanel>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(): string {
    return element().textContent?.replace(/\s+/g, ' ') ?? '';
  }

  function kpi(label: string): HTMLElement {
    return Array.from(element().querySelectorAll<HTMLElement>('.kpi')).find(
      (candidate) => candidate.querySelector('.kpi-top')?.textContent?.trim() === label,
    )!;
  }

  async function render(data: FarmDashboard = farm): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [FarmPanel],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(FarmPanel);
    fixture.componentRef.setInput('farm', data);
    fixture.componentRef.setInput('comparison', 'vs ontem');
    fixture.componentRef.setInput('periodRoute', 'hoje');
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('shows the four indicators of the farm, with the change and the comparison', async () => {
    await render();

    expect(kpi('Produção').textContent).toContain('2.900');
    expect(kpi('Produção').textContent).toContain('+1,4%');
    expect(kpi('Produção').textContent).toContain('vs ontem');
    expect(kpi('Produtividade').textContent).toContain('90,63%');
    expect(kpi('Custo de ração').textContent).toContain('R$ 159,60');
    expect(kpi('Custo por ovo').textContent).toContain('R$ 0,092');
  });

  it('counts the pending ones in reports, and not in days', async () => {
    await render();

    expect(kpi('Custo de ração').textContent).toContain('1 relatório sem ração completa');
    expect(kpi('Custo por ovo').textContent).toContain('1 relatório sem ração completa');
  });

  it('says how many of the active sectors have a report in the period', async () => {
    await render();

    expect(text()).toContain('2 de 3 setores com relatório');
  });

  it('agrees in number when only one sector is active', async () => {
    await render({ ...farm, activeSectors: 1, reportingSectors: 1 });

    expect(text()).toContain('1 de 1 setor com relatório');
  });

  it('shows a dash, and not zero, without a report in the period', async () => {
    await render({
      ...farm,
      reportingSectors: 0,
      indicators: {
        production: { goodDirection: 'UP', incompleteDays: 0 },
        layingRate: { goodDirection: 'UP', incompleteDays: 0 },
        feedCost: { goodDirection: 'DOWN', incompleteDays: 0 },
        costPerEgg: { goodDirection: 'DOWN', incompleteDays: 0 },
      },
    });

    expect(kpi('Produção').textContent).toContain('—');
    expect(text()).toContain('0 de 3 setores com relatório');
  });

  // ---------------------------------------------------------------- comparação dos setores (US2)

  const withSectors: FarmDashboard = {
    ...farm,
    sectors: [
      {
        sector: { id: '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11', name: 'Codornas — Galpão 1' },
        production: 1740,
        layingRate: 87,
        target: 85,
        targetStatus: 'ABOVE',
        costPerEgg: 0.092,
        todayReport: {
          id: '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55',
          productionStatus: 'COMPLETE',
          feedStatus: 'COMPLETE',
          mortalityStatus: 'RECORDED',
        },
        openAlerts: 3,
      },
      {
        sector: { id: '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33', name: 'Codornas — Galpão 4' },
        target: 85,
        openAlerts: 1,
      },
      {
        sector: { id: '7e9a1c3e-5b7d-4f9a-8c1e-3b5d7f9a1c55', name: 'Poedeiras — Galpão 2' },
        production: 840,
        layingRate: 70,
        target: 72,
        targetStatus: 'BELOW',
        costPerEgg: 0.143,
        todayReport: {
          id: '2c4e6a8c-0e2a-4c6e-8a0c-2e4a6c8e0a66',
          productionStatus: 'COMPLETE',
          feedStatus: 'PENDING',
          mortalityStatus: 'RECORDED',
        },
        openAlerts: 1,
      },
    ],
  };

  function rows(): HTMLTableRowElement[] {
    return Array.from(element().querySelectorAll<HTMLTableRowElement>('[data-sectors] tbody tr'));
  }

  function cell(row: HTMLTableRowElement, label: string): string {
    return (
      row.querySelector(`td[data-label="${label}"]`)?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    );
  }

  it('compares the sectors side by side, one row each, in the order of the tabs', async () => {
    await render(withSectors);

    const [first, , third] = rows();
    expect(rows()).toHaveLength(3);
    expect(cell(first, 'Setor')).toContain('Codornas — Galpão 1');
    expect(cell(first, 'Produção')).toBe('1.740');
    expect(cell(first, 'Produtividade')).toBe('87,00%');
    expect(cell(first, 'Meta')).toBe('85%');
    expect(cell(first, 'Custo por ovo')).toBe('R$ 0,092');
    expect(cell(first, 'Relatório de hoje')).toBe('Completo');
    expect(cell(first, 'Alertas')).toBe('3');
    expect(cell(third, 'Meta')).toBe('72%');
  });

  it('says above or below the target of each sector, the one below with the tone of attention', async () => {
    await render(withSectors);

    const [first, , third] = rows();
    expect(cell(first, 'Situação')).toBe('Acima da meta');
    expect(cell(third, 'Situação')).toBe('Abaixo da meta');
    expect(third.querySelector('ovyx-status-badge .badge')?.className).toContain('warning');
  });

  it('keeps the sector without report, with a dash and the report of today not opened', async () => {
    await render(withSectors);

    const second = rows()[1];
    expect(cell(second, 'Produção')).toBe('—');
    expect(cell(second, 'Produtividade')).toBe('—');
    expect(cell(second, 'Situação')).toBe('—');
    expect(cell(second, 'Relatório de hoje')).toBe('Não aberto');
  });

  it('says what is pending in the report of today', async () => {
    await render(withSectors);

    expect(cell(rows()[2], 'Relatório de hoje')).toBe('Ração pendente');
  });

  it('leads from each row to the dashboard of the sector, in the same period', async () => {
    await render(withSectors);

    const link = rows()[2].querySelector<HTMLAnchorElement>('a')!;
    expect(link.getAttribute('href')).toBe(
      '/?setor=7e9a1c3e-5b7d-4f9a-8c1e-3b5d7f9a1c55&periodo=hoje',
    );
    expect(link.getAttribute('aria-label')).toBe('Abrir o painel de Poedeiras — Galpão 2');
  });

  // ---------------------------------------------------------------- gráficos e classificação (US3)

  const withCharts: FarmDashboard = {
    ...farm,
    trend: farm.trend.map((day) =>
      day.production === undefined ? day : { ...day, costPerEgg: 0.097, target: 80.13 },
    ),
    target: 80.13,
    targetStatus: 'ABOVE',
    grades: {
      collected: 2900,
      standard: { grade: 'standard', count: 2852, percent: 98.3 },
      shares: [{ grade: 'small', count: 48, percent: 1.7 }],
    },
  };

  function card(title: string): HTMLElement {
    return Array.from(element().querySelectorAll<HTMLElement>('section.card')).find(
      (candidate) => candidate.querySelector('h2')?.textContent?.trim() === title,
    )!;
  }

  it('draws the daily productivity of the farm with the line of its target and says whether the last day reached it', async () => {
    await render(withCharts);

    const productivity = card('Produtividade diária');
    expect(productivity.querySelector('[data-reference]')).not.toBeNull();
    expect(productivity.textContent).toContain('Meta 80,13%');
    expect(productivity.querySelector('ovyx-status-badge')?.textContent?.trim()).toBe(
      'Acima da meta',
    );
    expect(
      productivity
        .querySelector('ovyx-line-chart [aria-label^="Produtividade diária"]')
        ?.getAttribute('aria-label'),
    ).toBe('Produtividade diária da granja toda, com a meta de 80,13%');
  });

  it('draws the cost per egg of the farm, only with the days with the feed complete', async () => {
    await render(withCharts);

    expect(card('Custo por ovo').querySelector('ovyx-line-chart')).not.toBeNull();
  });

  it('shows the grading of the farm, with the standard eggs in the ring', async () => {
    await render(withCharts);

    const grading = card('Classificação dos ovos');
    expect(grading.textContent).toContain('98,3%');
    expect(grading.textContent).toContain('padrão · 2.852 de 2.900 ovos');
    expect(grading.textContent).toContain('Pequenos');
  });

  it('says there is no report or no egg instead of empty charts', async () => {
    await render({
      ...farm,
      trend: farm.trend.map((day) => ({ date: day.date, reportingSectors: 0 })),
    });

    expect(card('Produtividade diária').textContent).toContain(
      'Nenhum relatório nos últimos 7 dias.',
    );
    expect(card('Custo por ovo').textContent).toContain(
      'Nenhum dia com a ração completa nos últimos 7 dias.',
    );
    expect(card('Classificação dos ovos').textContent).toContain('Nenhum ovo no período.');
  });
});
