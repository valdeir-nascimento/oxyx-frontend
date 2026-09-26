import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { Result, failure, success } from '../../../shared/application/result';
import { Notification } from '../../../shared/domain/notification';
import { FindDailyReportUseCase } from '../../application/daily-report/find-daily-report.usecase';
import { ListDailyReportsUseCase } from '../../application/daily-report/list-daily-reports.usecase';
import { DailyReport, DailyReportPage } from '../../domain/daily-report';
import { ReportChanges } from './report-changes';
import {
  activeReportSectorGuard,
  reportCrumbsResolver,
  reportTitleResolver,
  reportsCrumbsResolver,
  reportsTitleResolver,
} from './report-route';

/**
 * As rotas dos relatórios: o caminho e o título da aba trazem o setor e, na página do relatório, o dia,
 * com uma consulta só por navegação.
 */
describe('report route', () => {
  const sectorId = '5c8d2e4f-6a1b-4c3d-9e7f-0a2b4c6d8e33';
  const reportId = '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55';
  const sector = { id: sectorId, name: 'Codornas — Galpão 4', status: 'ACTIVE' as const };
  const notFound = Notification.of([{ code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado.' }]);

  let list: Mock<() => Promise<Result<DailyReportPage>>>;
  let find: Mock<() => Promise<Result<DailyReport>>>;

  function configure(page: Result<DailyReportPage>, report: Result<DailyReport>): void {
    list = vi.fn<() => Promise<Result<DailyReportPage>>>().mockResolvedValue(page);
    find = vi.fn<() => Promise<Result<DailyReport>>>().mockResolvedValue(report);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ListDailyReportsUseCase, useValue: { execute: list } },
        { provide: FindDailyReportUseCase, useValue: { execute: find } },
      ],
    });
  }

  function reportsRoute(): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap({ sectorId }) } as ActivatedRouteSnapshot;
  }

  function reportRoute(): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap({ sectorId, reportId }) } as ActivatedRouteSnapshot;
  }

  function run<T>(resolve: (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => T, route: ActivatedRouteSnapshot): T {
    return TestBed.runInInjectionContext(() => resolve(route, {} as RouterStateSnapshot));
  }

  const page = success<DailyReportPage>({ sector, content: [], page: 0, size: 1, totalElements: 0, totalPages: 0 });
  const report = success<DailyReport>({ sector, collectionDate: '2026-09-24' } as DailyReport);

  it('puts the sector between the sectors and the reports', async () => {
    configure(page, report);

    expect(await run(reportsCrumbsResolver, reportsRoute())).toEqual(['Produção', 'Setores', 'Codornas — Galpão 4', 'Relatórios']);
    expect(await run(reportsTitleResolver, reportsRoute())).toBe('Relatórios de Codornas — Galpão 4 — Ovyx');
  });

  it('leaves the sector out when it cannot be found', async () => {
    configure(failure(notFound), failure(notFound));

    expect(await run(reportsCrumbsResolver, reportsRoute())).toEqual(['Produção', 'Setores', 'Relatórios']);
    expect(await run(reportsTitleResolver, reportsRoute())).toBe('Relatórios — Ovyx');
  });

  it('asks the backend once for the crumbs and the title of the list', async () => {
    configure(page, report);
    const route = reportsRoute();

    await Promise.all([run(reportsCrumbsResolver, route), run(reportsTitleResolver, route)]);

    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith(sectorId, { page: 0, size: 1 });
  });

  it('puts the day of the report after the reports of the sector', async () => {
    configure(page, report);

    expect(await run(reportCrumbsResolver, reportRoute())).toEqual([
      'Produção',
      'Setores',
      'Codornas — Galpão 4',
      'Relatórios',
      'Relatório de 24/09/2026',
    ]);
    expect(await run(reportTitleResolver, reportRoute())).toBe('Relatório de 24/09/2026 — Ovyx');
  });

  it('asks the backend once for the crumbs and the title of the report', async () => {
    configure(page, report);
    const route = reportRoute();

    await Promise.all([run(reportCrumbsResolver, route), run(reportTitleResolver, route)]);

    expect(find).toHaveBeenCalledTimes(1);
    expect(find).toHaveBeenCalledWith(sectorId, reportId);
  });

  it('leaves the day out when the report cannot be found', async () => {
    configure(page, failure(Notification.of([{ code: 'DAILY_REPORT_NOT_FOUND', message: 'Relatório não encontrado.' }])));

    expect(await run(reportTitleResolver, reportRoute())).toBe('Relatório — Ovyx');
  });

  /** A rota de um diálogo de lançamento ou de edição: filha de uma aba, neta da página do relatório. */
  function entryDialogRoute(tab: string): ActivatedRouteSnapshot {
    return {
      paramMap: convertToParamMap({ cageId: '9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44' }),
      parent: {
        paramMap: convertToParamMap({}),
        routeConfig: { path: tab },
        parent: { paramMap: convertToParamMap({ sectorId, reportId }), parent: null },
      },
    } as unknown as ActivatedRouteSnapshot;
  }

  /** A rota do diálogo de relatório novo: filha da lista do setor. */
  function newReportRoute(): ActivatedRouteSnapshot {
    return {
      paramMap: convertToParamMap({}),
      parent: { paramMap: convertToParamMap({ sectorId }), parent: null },
    } as unknown as ActivatedRouteSnapshot;
  }

  function urlOf(result: unknown): string {
    return TestBed.inject(Router).serializeUrl(result as UrlTree);
  }

  const inactive = { ...sector, status: 'INACTIVE' as const };

  it('sends the new report dialog of an inactive sector back to the list, and asks the list again', async () => {
    configure(
      success<DailyReportPage>({ sector: inactive, content: [], page: 0, size: 1, totalElements: 0, totalPages: 0 }),
      report,
    );

    const result = await run(activeReportSectorGuard, newReportRoute());

    expect(urlOf(result)).toBe(`/setores/${sectorId}/relatorios`);
    expect(TestBed.inject(ReportChanges).version()).toBe(1);
  });

  it('opens the new report dialog of an active sector', async () => {
    configure(page, report);

    expect(await run(activeReportSectorGuard, newReportRoute())).toBe(true);
  });

  it('sends the dialogs of the report of an inactive sector back to the tab they came from', async () => {
    configure(page, success({ sector: inactive, collectionDate: '2026-09-24' } as DailyReport));

    const result = await run(activeReportSectorGuard, entryDialogRoute('mortalidade'));

    expect(urlOf(result)).toBe(`/setores/${sectorId}/relatorios/${reportId}/mortalidade`);
    expect(TestBed.inject(ReportChanges).version()).toBe(1);
  });

  it('opens the dialog when the report cannot be consulted: the backend says what happened', async () => {
    configure(page, failure(notFound));

    expect(await run(activeReportSectorGuard, entryDialogRoute('producao'))).toBe(true);
  });
});
