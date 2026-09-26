import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, ResolveFn, Router } from '@angular/router';
import { Result } from '../../../shared/application/result';
import { FindDailyReportUseCase } from '../../application/daily-report/find-daily-report.usecase';
import { ListDailyReportsUseCase } from '../../application/daily-report/list-daily-reports.usecase';
import { DailyReport, DailyReportPage } from '../../domain/daily-report';
import { dayOf } from '../labels/labels';
import { ReportChanges } from './report-changes';

const SECTORS = ['Produção', 'Setores'];

/** A consulta de cada rota: as migalhas, o título e o guard da mesma navegação pedem o mesmo dado. */
const pageLookups = new WeakMap<ActivatedRouteSnapshot, Promise<Result<DailyReportPage>>>();
const reportLookups = new WeakMap<ActivatedRouteSnapshot, Promise<Result<DailyReport>>>();

/** A primeira página da lista do setor do endereço, que traz o setor junto, uma vez por navegação. */
function pageOf(route: ActivatedRouteSnapshot): Promise<Result<DailyReportPage>> {
  let lookup = pageLookups.get(route);
  if (!lookup) {
    lookup = inject(ListDailyReportsUseCase).execute(route.paramMap.get('sectorId') ?? '', { page: 0, size: 1 });
    pageLookups.set(route, lookup);
  }
  return lookup;
}

/** O nome do setor do endereço, ou nenhum. */
function sectorOf(route: ActivatedRouteSnapshot): Promise<string | null> {
  return pageOf(route).then((result) => (result.success ? result.value.sector.name : null));
}

/** O relatório do endereço, uma vez por navegação. */
function reportOf(route: ActivatedRouteSnapshot): Promise<Result<DailyReport>> {
  let lookup = reportLookups.get(route);
  if (!lookup) {
    lookup = inject(FindDailyReportUseCase).execute(
      route.paramMap.get('sectorId') ?? '',
      route.paramMap.get('reportId') ?? '',
    );
    reportLookups.set(route, lookup);
  }
  return lookup;
}

/** A rota, ou a primeira acima dela, que tem o parâmetro no endereço. */
function ancestorWith(route: ActivatedRouteSnapshot, name: string): ActivatedRouteSnapshot | null {
  for (let current: ActivatedRouteSnapshot | null = route; current; current = current.parent) {
    if (current.paramMap.has(name)) {
      return current;
    }
  }
  return null;
}

/** O caminho da lista de relatórios: Setores › setor › Relatórios. */
export const reportsCrumbsResolver: ResolveFn<readonly string[]> = (route) =>
  sectorOf(route).then((name) => (name ? [...SECTORS, name, 'Relatórios'] : [...SECTORS, 'Relatórios']));

/** O título da aba da lista, com o setor. É da rota: é o que volta quando o diálogo fecha. */
export const reportsTitleResolver: ResolveFn<string> = (route) =>
  sectorOf(route).then((name) => (name ? `Relatórios de ${name} — Ovyx` : 'Relatórios — Ovyx'));

/** O caminho do relatório: Setores › setor › Relatórios › Relatório de 24/09/2026. */
export const reportCrumbsResolver: ResolveFn<readonly string[]> = (route) =>
  reportOf(route).then((result) =>
    result.success
      ? [...SECTORS, result.value.sector.name, 'Relatórios', `Relatório de ${dayOf(result.value.collectionDate)}`]
      : [...SECTORS, 'Relatórios'],
  );

/** O título da aba do relatório, com o dia. É da rota: é o que volta quando um diálogo fecha. */
export const reportTitleResolver: ResolveFn<string> = (route) =>
  reportOf(route).then((result) =>
    result.success ? `Relatório de ${dayOf(result.value.collectionDate)} — Ovyx` : 'Relatório — Ovyx',
  );

/**
 * Os diálogos de escrita não abrem sobre um setor inativo (FR-020), como o `activeSectorGuard` da 002: o
 * relatório novo volta à lista, e a correção e os lançamentos voltam à aba de onde saíram. Evita desenhar
 * um formulário que terminaria em recusa.
 *
 * Quem clicou numa tela aberta antes da inativação já está nesse endereço, e o roteador ignora a volta
 * para ele: por isso o guard também pede à tela que busque de novo (`ReportChanges`), e ela passa a
 * mostrar o aviso.
 *
 * Quando o setor ou o relatório não podem ser consultados, o diálogo abre: quem protege as escritas é o
 * backend, e a recusa dele diz o que houve.
 */
export const activeReportSectorGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const changes = inject(ReportChanges);
  const reportRoute = ancestorWith(route, 'reportId');
  if (reportRoute) {
    const tab = route.parent?.routeConfig?.path ?? 'producao';
    return reportOf(reportRoute).then((result) => {
      if (!result.success || result.value.sector.status !== 'INACTIVE') {
        return true;
      }
      changes.notify();
      return router.createUrlTree([
        '/setores',
        reportRoute.paramMap.get('sectorId'),
        'relatorios',
        reportRoute.paramMap.get('reportId'),
        tab,
      ]);
    });
  }
  const listRoute = route.parent ?? route;
  return pageOf(listRoute).then((result) => {
    if (!result.success || result.value.sector.status !== 'INACTIVE') {
      return true;
    }
    changes.notify();
    return router.createUrlTree(['/setores', listRoute.paramMap.get('sectorId'), 'relatorios']);
  });
};
