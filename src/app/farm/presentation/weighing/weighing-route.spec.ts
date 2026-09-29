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
import { GetWeighingOverviewUseCase } from '../../application/weighing/get-weighing-overview.usecase';
import { WeighingOverview } from '../../domain/weighing';
import { WeighingChanges } from './weighing-changes';
import { activeWeighingCageGuard, weighingCrumbsResolver } from './weighing-route';

type Lookup = (sectorId: string, cageId: string) => Promise<Result<WeighingOverview>>;

/**
 * A rota da tela Peso médio: o caminho traz o setor e a gaiola, como o protótipo mostra, e os diálogos
 * de pesagem não abrem numa gaiola ou num setor inativos (FR-008 da 005).
 */
describe('weighing route', () => {
  const sectorId = '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11';
  const cageId = '2a4c6e8a-0b1d-4f3a-9c5e-7a9b1d3f5a66';
  const page = `/setores/${sectorId}/gaiolas/${cageId}/peso`;
  const overview: WeighingOverview = {
    cage: { id: cageId, code: 'A-01', battery: 'A', number: 1, birdCount: 48, status: 'ACTIVE' },
    sector: { id: sectorId, name: 'Codornas — Galpão 1', status: 'ACTIVE' },
    chart: [],
    history: [],
  };
  const notFound = failure<WeighingOverview>(
    Notification.of([{ code: 'CAGE_NOT_FOUND', message: 'Gaiola não encontrada.' }]),
  );

  let find: Mock<Lookup>;

  function configure(answer: Result<WeighingOverview>): void {
    find = vi.fn<Lookup>().mockResolvedValue(answer);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: GetWeighingOverviewUseCase, useValue: { execute: find } },
      ],
    });
  }

  /** A rota da tela, que traz o setor e a gaiola no endereço. */
  function pageRoute(): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap({ sectorId, cageId }) } as ActivatedRouteSnapshot;
  }

  /** A rota de um diálogo de pesagem, filha da tela: `nova` ou a correção. */
  function dialogRoute(
    parent = pageRoute(),
    params: Record<string, string> = {},
  ): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap(params), parent } as unknown as ActivatedRouteSnapshot;
  }

  function run<T>(
    resolve: (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => T,
    route: ActivatedRouteSnapshot,
  ): T {
    return TestBed.runInInjectionContext(() => resolve(route, {} as RouterStateSnapshot));
  }

  function urlOf(tree: unknown): string {
    return TestBed.inject(Router).serializeUrl(tree as UrlTree);
  }

  it('puts the sector and the cage in the crumbs', async () => {
    configure(success(overview));

    const crumbs = await run(weighingCrumbsResolver, pageRoute());

    expect(find).toHaveBeenCalledWith(sectorId, cageId);
    expect(crumbs).toEqual([
      'Produção',
      'Setores',
      'Codornas — Galpão 1',
      'Gaiolas',
      'Gaiola A-01',
    ]);
  });

  it('leaves the names out of the crumbs when the cage cannot be found', async () => {
    configure(notFound);

    const crumbs = await run(weighingCrumbsResolver, pageRoute());

    expect(crumbs).toEqual(['Produção', 'Setores', 'Gaiolas', 'Peso médio']);
  });

  it('asks the backend once for the crumbs and the dialog of the same navigation', async () => {
    configure(success(overview));
    const route = pageRoute();

    await Promise.all([
      run(weighingCrumbsResolver, route),
      run(activeWeighingCageGuard, dialogRoute(route)),
    ]);

    expect(find).toHaveBeenCalledTimes(1);
  });

  it('opens a weighing dialog of an active cage in an active sector', async () => {
    configure(success(overview));

    const decision = await run(activeWeighingCageGuard, dialogRoute());

    expect(decision).toBe(true);
    expect(TestBed.inject(WeighingChanges).version()).toBe(0);
  });

  it('sends a weighing dialog of an inactive cage back to the page, and asks the page to look again', async () => {
    configure(success({ ...overview, cage: { ...overview.cage, status: 'INACTIVE' } }));

    const decision = await run(activeWeighingCageGuard, dialogRoute());

    expect(urlOf(decision)).toBe(page);
    expect(TestBed.inject(WeighingChanges).version()).toBe(1);
  });

  it('sends a weighing dialog of an inactive sector back to the page, and asks the page to look again', async () => {
    configure(success({ ...overview, sector: { ...overview.sector, status: 'INACTIVE' } }));

    const decision = await run(activeWeighingCageGuard, dialogRoute());

    expect(urlOf(decision)).toBe(page);
    expect(TestBed.inject(WeighingChanges).version()).toBe(1);
  });

  it('sends the correction of a weighing of an inactive cage back to the page', async () => {
    configure(success({ ...overview, cage: { ...overview.cage, status: 'INACTIVE' } }));
    const correction = dialogRoute(pageRoute(), {
      weighingId: '7b9d1f3a-5c7e-4a9b-8d1f-3a5c7e9b1d77',
    });

    const decision = await run(activeWeighingCageGuard, correction);

    expect(urlOf(decision)).toBe(page);
  });

  it('opens the dialog when the cage cannot be looked up, and leaves the refusal to the backend', async () => {
    configure(notFound);

    const decision = await run(activeWeighingCageGuard, dialogRoute());

    expect(decision).toBe(true);
  });
});
