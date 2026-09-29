import type { Mock } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { failure, success } from '../../../../shared/application/result';
import { VIEWER } from '../../../../shared/application/viewer';
import { Notification } from '../../../../shared/domain/notification';
import { GetDashboardOverviewUseCase } from '../../../application/dashboard/get-dashboard-overview.usecase';
import { GetSectorDashboardUseCase } from '../../../application/dashboard/get-sector-dashboard.usecase';
import { DashboardOverview, SectorDashboard } from '../../../domain/dashboard';
import { DashboardPage } from './dashboard-page';

/**
 * O painel do Início (US1 da 006; FR-001 a FR-009): o cabeçalho com a saudação e os setores completos, as
 * abas dos setores, o período e os quatro indicadores com a variação e a tendência. O setor e o período
 * ficam na URL, para o painel voltar ao mesmo lugar depois de um atalho.
 */
describe('DashboardPage', () => {
  const codornas = { id: '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11', name: 'Codornas — Galpão 1' };
  const poedeiras = { id: '7e9a1c3e-5b7d-4f9a-8c1e-3b5d7f9a1c55', name: 'Poedeiras — Galpão 2' };

  const overview: DashboardOverview = {
    today: '2026-09-24',
    partOfDay: 'MORNING',
    activeSectors: 3,
    completeToday: 2,
    sectors: [codornas, poedeiras],
  };

  const dashboard: SectorDashboard = {
    sector: { ...codornas, status: 'ACTIVE' },
    period: 'TODAY',
    from: '2026-09-24',
    to: '2026-09-24',
    todayReport: {
      id: '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55',
      productionStatus: 'COMPLETE',
      feedStatus: 'COMPLETE',
      mortalityStatus: 'RECORDED',
    },
    indicators: {
      production: {
        value: 1740,
        previous: 1700,
        change: 2.4,
        goodDirection: 'UP',
        incompleteDays: 0,
      },
      layingRate: { value: 87, previous: 85, change: 2, goodDirection: 'UP', incompleteDays: 0 },
      feedCost: {
        value: 159.6,
        previous: 157.25,
        change: 1.5,
        goodDirection: 'DOWN',
        incompleteDays: 0,
      },
      costPerEgg: {
        value: 0.092,
        previous: 0.093,
        change: -1.1,
        goodDirection: 'DOWN',
        incompleteDays: 0,
      },
    },
    trend: [
      {
        date: '2026-09-18',
        production: 1690,
        layingRate: 84.5,
        feedCost: 156.1,
        costPerEgg: 0.092,
      },
      { date: '2026-09-19' },
      {
        date: '2026-09-20',
        production: 1688,
        layingRate: 84.4,
        feedCost: 155.8,
        costPerEgg: 0.092,
      },
      {
        date: '2026-09-21',
        production: 1715,
        layingRate: 85.75,
        feedCost: 158.3,
        costPerEgg: 0.092,
      },
      { date: '2026-09-22', production: 1720, layingRate: 86, feedCost: 158.75, costPerEgg: 0.092 },
      { date: '2026-09-23', production: 1700, layingRate: 85, feedCost: 157.25, costPerEgg: 0.093 },
      { date: '2026-09-24', production: 1740, layingRate: 87, feedCost: 159.6, costPerEgg: 0.092 },
    ],
    target: 85,
    targetStatus: 'ABOVE',
    alerts: [],
    openAlerts: 0,
    latestReports: [],
    grades: {
      collected: 1740,
      standard: { grade: 'standard', count: 1650, percent: 94.8 },
      shares: [
        { grade: 'small', count: 30, percent: 1.7 },
        { grade: 'jumbo', count: 12, percent: 0.7 },
        { grade: 'dirty', count: 20, percent: 1.1 },
        { grade: 'cracked', count: 18, percent: 1 },
        { grade: 'bloodSpot', count: 6, percent: 0.3 },
        { grade: 'abnormal', count: 4, percent: 0.2 },
      ],
    },
  };

  let getOverview: Mock;
  let getDashboard: Mock;
  let harness: RouterTestingHarness;

  function element(): HTMLElement {
    return harness.routeNativeElement as HTMLElement;
  }

  function text(): string {
    return element().textContent?.replace(/\s+/g, ' ') ?? '';
  }

  function kpi(label: string): HTMLElement {
    return Array.from(element().querySelectorAll<HTMLElement>('.kpi')).find(
      (candidate) => candidate.querySelector('.kpi-top')?.textContent?.trim() === label,
    )!;
  }

  function kpiText(label: string, selector: string): string {
    return kpi(label).querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function open(url: string, firstName = 'Maria'): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: DashboardPage }]),
        { provide: GetDashboardOverviewUseCase, useValue: { execute: getOverview } },
        { provide: GetSectorDashboardUseCase, useValue: { execute: getDashboard } },
        {
          provide: VIEWER,
          useValue: { isAdministrator: signal(false), firstName: signal(firstName) },
        },
      ],
    });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, DashboardPage);
    await settle();
  }

  function url(): string {
    return TestBed.inject(Router).url;
  }

  beforeEach(() => {
    getOverview = vi.fn().mockResolvedValue(success(overview));
    getDashboard = vi.fn().mockResolvedValue(success(dashboard));
  });

  // ---------------------------------------------------------------- cabeçalho

  it('greets the person by the first name and the part of the day of the farm', async () => {
    await open('/');

    expect(element().querySelector('h1')?.textContent?.trim()).toBe('Bom dia, Maria');
  });

  it('greets in the afternoon and in the evening, and without a name when there is none', async () => {
    getOverview.mockResolvedValue(success({ ...overview, partOfDay: 'EVENING' }));

    await open('/', '');

    expect(element().querySelector('h1')?.textContent?.trim()).toBe('Boa noite');
  });

  it('tells the day of the farm and how many sectors have the report of today complete', async () => {
    await open('/');

    expect(text()).toContain('Quinta-feira, 24 de setembro de 2026.');
    expect(text()).toContain('2 de 3 setores com o relatório do dia completo.');
  });

  // ---------------------------------------------------------------- abas e período

  it('chooses the first sector and today when the address says nothing, and writes them in it', async () => {
    await open('/');

    expect(url()).toBe(`/?setor=${codornas.id}&periodo=hoje`);
    expect(getDashboard).toHaveBeenCalledWith(codornas.id, 'TODAY');
  });

  it('shows a tab for each sector, with the one of the address as the current', async () => {
    await open(`/?setor=${poedeiras.id}&periodo=hoje`);

    const tabs = Array.from(element().querySelectorAll<HTMLAnchorElement>('nav.tabs a'));
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([codornas.name, poedeiras.name]);
    expect(tabs.map((tab) => tab.getAttribute('aria-current'))).toEqual([null, 'page']);
    expect(getDashboard).toHaveBeenCalledWith(poedeiras.id, 'TODAY');
  });

  it('falls back to the first sector when the one of the address is not a tab', async () => {
    await open('/?setor=setor-inativo&periodo=ontem');

    expect(url()).toBe(`/?setor=${codornas.id}&periodo=ontem`);
    expect(getDashboard).toHaveBeenLastCalledWith(codornas.id, 'YESTERDAY');
  });

  it('asks for the dashboard again when the period changes, and writes it in the address', async () => {
    await open(`/?setor=${codornas.id}&periodo=hoje`);

    const sevenDays = Array.from(element().querySelectorAll<HTMLButtonElement>('.seg button')).find(
      (button) => button.textContent?.trim() === '7 dias',
    )!;
    sevenDays.click();
    await settle();

    expect(url()).toBe(`/?setor=${codornas.id}&periodo=7-dias`);
    expect(getDashboard).toHaveBeenLastCalledWith(codornas.id, 'LAST_7_DAYS');
  });

  // ---------------------------------------------------------------- indicadores

  it('shows the four indicators written in Portuguese, with the change and the comparison', async () => {
    await open(`/?setor=${codornas.id}&periodo=hoje`);

    expect(kpiText('Produção', '.kpi-val')).toBe('1.740 ovos');
    expect(kpiText('Produtividade', '.kpi-val')).toBe('87,00%');
    expect(kpiText('Custo de ração', '.kpi-val')).toBe('R$ 159,60');
    expect(kpiText('Custo por ovo', '.kpi-val')).toBe('R$ 0,092');
    expect(kpiText('Produção', '.delta:not(.comparison)')).toBe('+2,4%');
    expect(kpiText('Produtividade', '.delta:not(.comparison)')).toBe('+2,00 p.p.');
    expect(kpiText('Custo por ovo', '.delta:not(.comparison)')).toBe('−1,1%');
    expect(kpiText('Produção', '.comparison')).toBe('vs ontem');
  });

  it('colors the change by its good direction: a higher cost is bad, a lower one is good', async () => {
    await open(`/?setor=${codornas.id}&periodo=hoje`);

    expect(kpi('Produção').querySelector('.delta:not(.comparison)')!.classList).toContain('good');
    expect(kpi('Custo de ração').querySelector('.delta:not(.comparison)')!.classList).toContain(
      'bad',
    );
    expect(kpi('Custo por ovo').querySelector('.delta:not(.comparison)')!.classList).toContain(
      'good',
    );
  });

  it('compares yesterday with the day before, and the 7 days with the week before', async () => {
    getDashboard.mockResolvedValue(success({ ...dashboard, period: 'LAST_7_DAYS' }));

    await open(`/?setor=${codornas.id}&periodo=7-dias`);

    expect(kpiText('Produção', '.comparison')).toBe('vs semana anterior');
  });

  it('draws the trend of the last 7 days in each indicator', async () => {
    await open(`/?setor=${codornas.id}&periodo=hoje`);

    expect(kpi('Produção').querySelector('svg.spark')?.getAttribute('aria-label')).toBe(
      'Produção dos últimos 7 dias',
    );
  });

  it('tells the days left out of the cost when the feed was pending', async () => {
    getDashboard.mockResolvedValue(
      success({
        ...dashboard,
        indicators: {
          ...dashboard.indicators,
          feedCost: { ...dashboard.indicators.feedCost, incompleteDays: 1 },
        },
      }),
    );

    await open(`/?setor=${codornas.id}&periodo=7-dias`);

    expect(kpiText('Custo de ração', '.kpi-note')).toBe('1 dia sem ração completa');
  });

  it('shows a dash, and not zero, without the report of today, and offers to open it', async () => {
    getDashboard.mockResolvedValue(
      success({
        ...dashboard,
        todayReport: undefined,
        indicators: {
          production: { previous: 912, goodDirection: 'UP', incompleteDays: 0 },
          layingRate: { previous: 91.2, goodDirection: 'UP', incompleteDays: 0 },
          feedCost: { goodDirection: 'DOWN', incompleteDays: 0 },
          costPerEgg: { goodDirection: 'DOWN', incompleteDays: 0 },
        },
      }),
    );

    await open(`/?setor=${codornas.id}&periodo=hoje`);

    expect(kpiText('Produção', '.kpi-val')).toBe('—');
    expect(kpiText('Produção', '.delta:not(.comparison)')).toBe('sem comparação');
    const openToday = Array.from(element().querySelectorAll<HTMLAnchorElement>('a')).find(
      (link) => link.textContent?.trim() === 'Abrir relatório de hoje',
    );
    expect(openToday?.getAttribute('href')).toBe(`/setores/${codornas.id}/relatorios/novo`);
  });

  it('shows the refusal when the dashboard cannot be read', async () => {
    getDashboard.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'UNEXPECTED', message: 'Não foi possível falar com o servidor.' },
        ]),
      ),
    );

    await open(`/?setor=${codornas.id}&periodo=hoje`);

    expect(text()).toContain('Não foi possível carregar o painel:');
    expect(text()).toContain('Não foi possível falar com o servidor.');
  });

  // ---------------------------------------------------------------- gráficos e classificação (US2)

  function card(title: string): HTMLElement {
    return Array.from(element().querySelectorAll<HTMLElement>('section.card')).find(
      (candidate) => candidate.querySelector('h2')?.textContent?.trim() === title,
    )!;
  }

  it('draws the daily productivity with the line of the target and says whether the last day reached it', async () => {
    await open(`/?setor=${codornas.id}&periodo=hoje`);

    const productivity = card('Produtividade diária');
    expect(productivity.querySelector('[data-reference]')).not.toBeNull();
    expect(productivity.textContent).toContain('Meta 85%');
    expect(productivity.querySelector('ovyx-status-badge')?.textContent?.trim()).toBe(
      'Acima da meta',
    );
  });

  it('says below the target when the last day did not reach it', async () => {
    getDashboard.mockResolvedValue(success({ ...dashboard, targetStatus: 'BELOW' }));

    await open(`/?setor=${codornas.id}&periodo=hoje`);

    expect(
      card('Produtividade diária').querySelector('ovyx-status-badge')?.textContent?.trim(),
    ).toBe('Abaixo da meta');
  });

  it('leaves the days without a value out of the charts, instead of drawing them as zero', async () => {
    await open(`/?setor=${codornas.id}&periodo=hoje`);

    expect(card('Custo por ovo').querySelectorAll('[data-day]')).toHaveLength(6);
    expect(card('Produtividade diária').querySelectorAll('[data-day]')).toHaveLength(6);
  });

  it('shows the grading of the eggs of the period, with the standard ones in the ring', async () => {
    await open(`/?setor=${codornas.id}&periodo=hoje`);

    const grading = card('Classificação dos ovos');
    expect(grading.textContent).toContain(`Hoje · ${codornas.name}`);
    expect(grading.querySelector('.hero-q')?.textContent).toContain('94,8%');
    expect(grading.querySelector('.hero-q')?.textContent).toContain('padrão · 1.650 de 1.740 ovos');
    expect(
      Array.from(grading.querySelectorAll('.bar-row .lab')).map((label) =>
        label.textContent?.trim(),
      ),
    ).toEqual(['Pequenos', 'Jumbo', 'Sujos', 'Trincados', 'Com sangue', 'Anormais']);
  });

  it('says there are no eggs in the period instead of an empty grading', async () => {
    getDashboard.mockResolvedValue(success({ ...dashboard, grades: undefined }));

    await open(`/?setor=${codornas.id}&periodo=hoje`);

    expect(card('Classificação dos ovos').textContent).toContain('Nenhum ovo no período.');
  });

  // ---------------------------------------------------------------- alertas e pendências (US3)

  const alerts: SectorDashboard['alerts'] = [
    {
      kind: 'FEED_PENDING',
      tone: 'INFO',
      title: 'Ração pendente no relatório de hoje',
      detail: 'Lance a ração de 1 gaiola para calcular o custo por ovo.',
      target: { reportId: '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55' },
    },
    {
      kind: 'HIGH_MORTALITY',
      tone: 'WARNING',
      title: 'Mortalidade acima da média na gaiola B-07',
      detail: '2 aves removidas hoje; a média do setor é 0,4 por gaiola ao dia.',
      target: { reportId: '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55', cageId: 'b07', cageCode: 'B-07' },
    },
    {
      kind: 'WEIGHT_OUT_OF_RANGE',
      tone: 'WARNING',
      title: 'Pesagem fora da faixa na gaiola A-02',
      detail: '150,8 g em 24/09/2026; a faixa do setor é 155–175 g.',
      target: { cageId: 'a02', cageCode: 'A-02' },
    },
  ];

  it('lists the alerts of today with the sector, how many are open and a shortcut for each', async () => {
    getDashboard.mockResolvedValue(success({ ...dashboard, alerts, openAlerts: 3 }));

    await open(`/?setor=${codornas.id}&periodo=hoje`);

    const list = card('Alertas e pendências');
    expect(list.textContent).toContain(codornas.name);
    expect(list.querySelector('ovyx-status-badge')?.textContent?.trim()).toBe('3 abertos');
    const items = Array.from(list.querySelectorAll<HTMLElement>('.list-item'));
    expect(items.map((item) => item.querySelector('b')?.textContent?.trim())).toEqual([
      'Ração pendente no relatório de hoje',
      'Mortalidade acima da média na gaiola B-07',
      'Pesagem fora da faixa na gaiola A-02',
    ]);
    expect(items[1].querySelector('p')?.textContent).toContain('a média do setor é 0,4');
    expect(items[0].querySelector('.st-ico')?.classList).toContain('info');
    expect(items[1].querySelector('.st-ico')?.classList).toContain('warning');
    const shortcut = list.querySelector<HTMLAnchorElement>(
      '[aria-label="Abrir: Pesagem fora da faixa na gaiola A-02"]',
    );
    expect(shortcut?.getAttribute('href')).toBe(`/setores/${codornas.id}/gaiolas/a02/peso`);
  });

  it('says one alert is open, in the singular', async () => {
    getDashboard.mockResolvedValue(
      success({ ...dashboard, alerts: alerts.slice(0, 1), openAlerts: 1 }),
    );

    await open(`/?setor=${codornas.id}&periodo=hoje`);

    expect(
      card('Alertas e pendências').querySelector('ovyx-status-badge')?.textContent?.trim(),
    ).toBe('1 aberto');
  });

  it('says the report of today is complete and no alert is open, instead of an empty list', async () => {
    getDashboard.mockResolvedValue(success({ ...dashboard, alerts: [], openAlerts: 0 }));

    await open(`/?setor=${codornas.id}&periodo=hoje`);

    const list = card('Alertas e pendências');
    expect(list.textContent).toContain('Relatório de hoje completo');
    expect(list.textContent).toContain('Nenhum alerta aberto.');
    expect(list.querySelector('.st-ico')?.classList).toContain('success');
  });

  // ---------------------------------------------------------------- últimos relatórios e convite (US4)

  const latestReports: SectorDashboard['latestReports'] = [
    {
      id: 'r-24',
      collectionDate: '2026-09-24',
      collectionTime: '06:30',
      openedBy: { id: 'm', name: 'Marina Alves' },
      collectedEggs: 1740,
      removedBirds: 3,
      productionStatus: 'COMPLETE',
      feedStatus: 'COMPLETE',
      mortalityStatus: 'RECORDED',
    },
    {
      id: 'r-23',
      collectionDate: '2026-09-23',
      collectionTime: '06:40',
      openedBy: { id: 'j', name: 'João Pereira' },
      collectedEggs: 1700,
      removedBirds: 1,
      productionStatus: 'COMPLETE',
      feedStatus: 'PENDING',
      mortalityStatus: 'RECORDED',
    },
  ];

  it('lists the latest reports with the day, who opened, the eggs, the removals and how each stands', async () => {
    getDashboard.mockResolvedValue(success({ ...dashboard, latestReports }));

    await open(`/?setor=${codornas.id}&periodo=hoje`);

    const latest = card('Últimos relatórios');
    const rows = Array.from(latest.querySelectorAll<HTMLTableRowElement>('tbody tr'));
    expect(rows).toHaveLength(2);
    const cells = (row: HTMLTableRowElement, label: string): string =>
      row.querySelector(`td[data-label="${label}"]`)?.textContent?.replace(/\s+/g, ' ').trim() ??
      '';
    expect(cells(rows[0], 'Data')).toContain('Qui, 24/09/2026');
    expect(cells(rows[0], 'Data')).toContain('06:30');
    expect(cells(rows[0], 'Responsável')).toBe('Marina Alves');
    expect(cells(rows[0], 'Produção')).toBe('1.740');
    expect(cells(rows[0], 'Removidos')).toBe('3');
    expect(cells(rows[0], 'Lançamentos')).toBe('Completo');
    expect(cells(rows[1], 'Lançamentos')).toBe('Ração pendente');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe(
      `/setores/${codornas.id}/relatorios/r-24`,
    );
  });

  it('leads to all the reports of the sector', async () => {
    getDashboard.mockResolvedValue(success({ ...dashboard, latestReports }));

    await open(`/?setor=${codornas.id}&periodo=hoje`);

    const all = Array.from(
      card('Últimos relatórios').querySelectorAll<HTMLAnchorElement>('a'),
    ).find((link) => link.textContent?.trim() === 'Ver todos');
    expect(all?.getAttribute('href')).toBe(`/setores/${codornas.id}/relatorios`);
  });

  it('invites to register a sector and open the first report when no sector has reports', async () => {
    getOverview.mockResolvedValue(success({ ...overview, sectors: [], completeToday: 0 }));

    await open('/');

    expect(text()).toContain('Nenhum setor com lançamentos');
    expect(text()).toContain(
      'Cadastre um setor e lance o primeiro relatório para ver produção e custo aqui.',
    );
    const toSectors = Array.from(element().querySelectorAll<HTMLAnchorElement>('a')).find(
      (link) => link.textContent?.trim() === 'Ir para setores',
    );
    expect(toSectors?.getAttribute('href')).toBe('/setores');
    expect(element().querySelector('nav.tabs')).toBeNull();
    expect(element().querySelector('.kpi')).toBeNull();
    expect(getDashboard).not.toHaveBeenCalled();
    expect(url()).toBe('/');
  });

  // ---------------------------------------------------------------- revisão 1 (T048)

  it('shows the refusal of the overview, without tabs, indicators nor dashboard', async () => {
    getOverview.mockResolvedValue(
      failure(
        Notification.of([
          { code: 'UNEXPECTED', message: 'Não foi possível falar com o servidor.' },
        ]),
      ),
    );

    await open('/');

    expect(text()).toContain('Não foi possível carregar o painel:');
    expect(element().querySelector('nav.tabs')).toBeNull();
    expect(element().querySelector('.kpi')).toBeNull();
    expect(getDashboard).not.toHaveBeenCalled();
  });

  it('keeps the dashboard of the last tab chosen when an older answer arrives late', async () => {
    let answerCodornas: (value: unknown) => void = () => undefined;
    getDashboard.mockImplementation((sectorId: string) =>
      sectorId === codornas.id
        ? new Promise((resolve) => (answerCodornas = resolve))
        : Promise.resolve(success({ ...dashboard, sector: { ...poedeiras, status: 'ACTIVE' } })),
    );
    await open(`/?setor=${codornas.id}&periodo=hoje`);

    await harness.navigateByUrl(`/?setor=${poedeiras.id}&periodo=hoje`);
    await settle();
    answerCodornas(success(dashboard));
    await settle();

    expect(card('Classificação dos ovos').textContent).toContain(poedeiras.name);
  });

  it('leads the shortcuts by the sector of the dashboard shown, and not by the address still loading', async () => {
    const alerts: SectorDashboard['alerts'] = [
      {
        kind: 'WEIGHT_OUT_OF_RANGE',
        tone: 'WARNING',
        title: 'Pesagem fora da faixa na gaiola A-02',
        detail: '150,8 g em 24/09/2026; a faixa do setor é 155–175 g.',
        target: { cageId: 'a02', cageCode: 'A-02' },
      },
    ];
    getDashboard.mockImplementation((sectorId: string) =>
      sectorId === codornas.id
        ? Promise.resolve(success({ ...dashboard, alerts, openAlerts: 1 }))
        : new Promise(() => undefined),
    );
    await open(`/?setor=${codornas.id}&periodo=hoje`);

    await harness.navigateByUrl(`/?setor=${poedeiras.id}&periodo=7-dias`);
    await settle();

    const shortcut = card('Alertas e pendências').querySelector<HTMLAnchorElement>(
      '[aria-label="Abrir: Pesagem fora da faixa na gaiola A-02"]',
    );
    expect(shortcut?.getAttribute('href')).toBe(`/setores/${codornas.id}/gaiolas/a02/peso`);
    expect(kpiText('Produção', '.comparison')).toBe('vs ontem');
  });

  it('names the productivity chart with the target that comes from the dashboard', async () => {
    getDashboard.mockResolvedValue(success({ ...dashboard, target: 80 }));

    await open(`/?setor=${codornas.id}&periodo=hoje`);

    expect(
      card('Produtividade diária').querySelector('svg[role="img"]')?.getAttribute('aria-label'),
    ).toContain('com a meta de 80%');
    expect(card('Produtividade diária').textContent).toContain('Meta 80%');
  });
});
