import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, ResolveFn, Router } from '@angular/router';
import { Result } from '../../../shared/application/result';
import { GetWeighingOverviewUseCase } from '../../application/weighing/get-weighing-overview.usecase';
import { WeighingOverview } from '../../domain/weighing';
import { WeighingChanges } from './weighing-changes';

const SECTORS = ['Produção', 'Setores'];

/** A consulta da gaiola de cada rota da tela: as migalhas e o guard da mesma navegação pedem a mesma. */
const lookups = new WeakMap<ActivatedRouteSnapshot, Promise<Result<WeighingOverview>>>();

/**
 * O acompanhamento da gaiola do endereço da tela, consultado uma vez por navegação: o roteador entrega a
 * mesma rota às migalhas e, como mãe, ao guard do diálogo, e a segunda pergunta reaproveita a primeira.
 */
function overviewOf(route: ActivatedRouteSnapshot): Promise<Result<WeighingOverview>> {
  let lookup = lookups.get(route);
  if (!lookup) {
    lookup = inject(GetWeighingOverviewUseCase).execute(
      route.paramMap.get('sectorId') ?? '',
      route.paramMap.get('cageId') ?? '',
    );
    lookups.set(route, lookup);
  }
  return lookup;
}

/**
 * O caminho da tela Peso médio, como o protótipo mostra (Setores › setor › Gaiolas › Gaiola A-01). Sem a
 * gaiola, o caminho fica sem o nome, e a própria tela diz o que houve.
 */
export const weighingCrumbsResolver: ResolveFn<readonly string[]> = (route) =>
  overviewOf(route).then((result) =>
    result.success
      ? [...SECTORS, result.value.sector.name, 'Gaiolas', `Gaiola ${result.value.cage.code}`]
      : [...SECTORS, 'Gaiolas', 'Peso médio'],
  );

/**
 * Os diálogos de pesagem — o registro e a correção — não abrem numa gaiola ou num setor inativos (FR-008
 * da 005): o endereço digitado volta à tela, que diz que as pesagens são só para consulta. Como o
 * `activeSectorGuard`, evita desenhar um formulário que terminaria em recusa.
 *
 * Quem clicou em "Registrar pesagem" numa tela aberta antes da inativação já está nesse endereço, e o
 * roteador ignora a volta para ele: por isso o guard também pede à tela que leia de novo, e ela passa a
 * mostrar o aviso (QA N-7 da 002).
 *
 * Quando a gaiola não pode ser consultada, o diálogo abre: quem protege as escritas é o backend, e a
 * recusa dele diz o que houve.
 */
export const activeWeighingCageGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const changes = inject(WeighingChanges);
  return overviewOf(route.parent ?? route).then((result) => {
    if (
      !result.success ||
      (result.value.cage.status === 'ACTIVE' && result.value.sector.status === 'ACTIVE')
    ) {
      return true;
    }
    changes.notify();
    return router.createUrlTree([
      '/setores',
      result.value.sector.id,
      'gaiolas',
      result.value.cage.id,
      'peso',
    ]);
  });
};
