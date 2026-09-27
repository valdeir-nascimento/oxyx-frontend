import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, convertToParamMap, provideRouter } from '@angular/router';
import { Result, failure, success } from '../../../shared/application/result';
import { Notification } from '../../../shared/domain/notification';
import { FindSectorByIdUseCase } from '../../application/sector/find-sector-by-id.usecase';
import { Sector } from '../../domain/sector';
import { CageChanges } from './cage-changes';
import { activeSectorGuard, sectorCrumbsResolver, sectorTitleResolver } from './sector-route';

/**
 * A rota das gaiolas de um setor: o caminho e o título da aba trazem o nome do setor, como o protótipo
 * mostra, e os diálogos de gaiola não abrem sobre um setor inativo.
 */
describe('sector route', () => {
  const sectorId = '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11';
  const codornas: Sector = {
    id: sectorId,
    name: 'Codornas — Galpão 1',
    status: 'ACTIVE',
    activeCageCount: 48,
    birdCount: 1920,
    batteries: ['A', 'B'],
    createdAt: '2026-09-21T08:30:00Z',
    updatedAt: '2026-09-24T17:42:05Z',
  };
  const notFound = failure<Sector>(
    Notification.of([{ code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado.' }]),
  );

  let find: Mock<(id: string) => Promise<Result<Sector>>>;

  function configure(answer: Result<Sector>): void {
    find = vi.fn<(id: string) => Promise<Result<Sector>>>().mockResolvedValue(answer);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: FindSectorByIdUseCase, useValue: { execute: find } }],
    });
  }

  /** A rota das gaiolas, que traz o setor no endereço. */
  function cagesRoute(): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap({ sectorId }) } as ActivatedRouteSnapshot;
  }

  /** A rota de um diálogo de gaiola, filha da das gaiolas. */
  function dialogRoute(): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap({}), parent: cagesRoute() } as unknown as ActivatedRouteSnapshot;
  }

  function run<T>(resolve: (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => T, route: ActivatedRouteSnapshot): T {
    return TestBed.runInInjectionContext(() => resolve(route, {} as RouterStateSnapshot));
  }

  function urlOf(tree: unknown): string {
    return TestBed.inject(Router).serializeUrl(tree as UrlTree);
  }

  it('puts the name of the sector between the sectors and the cages', async () => {
    configure(success(codornas));

    const crumbs = await run(sectorCrumbsResolver, cagesRoute());

    expect(crumbs).toEqual(['Produção', 'Setores', 'Codornas — Galpão 1', 'Gaiolas']);
  });

  it('leaves the name out of the crumbs when the sector cannot be found', async () => {
    configure(notFound);

    const crumbs = await run(sectorCrumbsResolver, cagesRoute());

    expect(crumbs).toEqual(['Produção', 'Setores', 'Gaiolas']);
  });

  it('names the tab after the sector', async () => {
    configure(success(codornas));

    const title = await run(sectorTitleResolver, cagesRoute());

    expect(title).toBe('Gaiolas de Codornas — Galpão 1 — Ovyx');
  });

  it('leaves the name out of the tab when the sector cannot be found', async () => {
    configure(notFound);

    const title = await run(sectorTitleResolver, cagesRoute());

    expect(title).toBe('Gaiolas — Ovyx');
  });

  it('asks the backend once for the crumbs and the title of the same navigation', async () => {
    configure(success(codornas));
    const route = cagesRoute();

    await Promise.all([run(sectorCrumbsResolver, route), run(sectorTitleResolver, route)]);

    expect(find).toHaveBeenCalledTimes(1);
    expect(find).toHaveBeenCalledWith(sectorId);
  });

  it('opens a cage dialog over the cages of an active sector', async () => {
    configure(success(codornas));

    const decision = await run(activeSectorGuard, dialogRoute());

    expect(decision).toBe(true);
  });

  it('sends a cage dialog of an inactive sector back to its cages, where the list says why', async () => {
    configure(success({ ...codornas, status: 'INACTIVE' }));

    const decision = await run(activeSectorGuard, dialogRoute());

    expect(urlOf(decision)).toBe(`/setores/${sectorId}/gaiolas`);
  });

  it('asks the cages left open behind the dialog to look again, for them to show the notice', async () => {
    // QA N-7: na lista aberta antes da inativação, o guard devolvia para o mesmo endereço, o roteador
    // ignorava a navegação, e o clique em "Nova gaiola" não fazia nada.
    configure(success({ ...codornas, status: 'INACTIVE' }));

    await run(activeSectorGuard, dialogRoute());

    expect(TestBed.inject(CageChanges).version()).toBe(1);
  });

  it('does not make the cages look again over an active sector', async () => {
    configure(success(codornas));

    await run(activeSectorGuard, dialogRoute());

    expect(TestBed.inject(CageChanges).version()).toBe(0);
  });

  it('opens the dialog when the sector cannot be looked up, and leaves the refusal to the backend', async () => {
    configure(notFound);

    const decision = await run(activeSectorGuard, dialogRoute());

    expect(decision).toBe(true);
  });
});
