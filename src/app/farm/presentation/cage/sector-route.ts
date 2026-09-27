import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, ResolveFn, Router } from '@angular/router';
import { Result } from '../../../shared/application/result';
import { FindSectorByIdUseCase } from '../../application/sector/find-sector-by-id.usecase';
import { Sector } from '../../domain/sector';
import { CageChanges } from './cage-changes';

const SECTORS = ['Produção', 'Setores'];

/** A consulta do setor de cada rota: as migalhas e o título da mesma navegação pedem o mesmo setor. */
const lookups = new WeakMap<ActivatedRouteSnapshot, Promise<Result<Sector>>>();

/**
 * O setor do endereço, consultado uma vez por navegação: o roteador entrega a mesma rota às migalhas e
 * ao título, e a segunda pergunta reaproveita a primeira.
 */
function sectorOf(route: ActivatedRouteSnapshot): Promise<Result<Sector>> {
  let lookup = lookups.get(route);
  if (!lookup) {
    lookup = inject(FindSectorByIdUseCase).execute(route.paramMap.get('sectorId') ?? '');
    lookups.set(route, lookup);
  }
  return lookup;
}

/**
 * O caminho da tela de gaiolas, com o nome do setor entre os setores e as gaiolas, como o protótipo
 * mostra (Setores › setor › Gaiolas). A barra superior lê o `data.crumbs` da rota; o nome do setor só
 * se sabe perguntando ao backend.
 *
 * Sem o setor — endereço de setor nenhum, falha de rede —, o caminho fica sem o nome, e a própria tela
 * diz o que houve.
 */
export const sectorCrumbsResolver: ResolveFn<readonly string[]> = (route) =>
  sectorOf(route).then((result) =>
    result.success ? [...SECTORS, result.value.name, 'Gaiolas'] : [...SECTORS, 'Gaiolas'],
  );

/**
 * O título da aba, com o nome do setor. É da rota, e não da tela: o título que a tela escrevia perdia
 * para o título estático da rota quando um diálogo de gaiola fechava, e a aba ficava sem o setor.
 */
export const sectorTitleResolver: ResolveFn<string> = (route) =>
  sectorOf(route).then((result) => (result.success ? `Gaiolas de ${result.value.name} — Ovyx` : 'Gaiolas — Ovyx'));

/**
 * Os diálogos de gaiola não abrem sobre um setor inativo (invariante 3, FR-014): o endereço digitado
 * volta às gaiolas do setor, onde a lista diz que ele precisa ser reativado antes. Como o
 * `administratorGuard`, evita desenhar um formulário que terminaria em recusa.
 *
 * Quem clicou em "Nova gaiola" numa lista aberta antes da inativação já está nesse endereço, e o
 * roteador ignora a volta para ele: por isso o guard também pede à lista que busque de novo, e ela
 * passa a mostrar o aviso (QA N-7).
 *
 * Quando o setor não pode ser consultado, o diálogo abre: quem protege as escritas é o backend, e a
 * recusa dele diz o que houve.
 */
export const activeSectorGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const changes = inject(CageChanges);
  return sectorOf(route.parent ?? route).then((result) => {
    if (!result.success || result.value.status !== 'INACTIVE') {
      return true;
    }
    changes.notify();
    return router.createUrlTree(['/setores', result.value.id, 'gaiolas']);
  });
};
