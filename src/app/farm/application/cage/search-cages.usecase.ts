import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { CagePage, CageSearch } from '../../domain/cage';
import { CAGE_GATEWAY } from './cage-gateway';

/**
 * Pesquisa as gaiolas de um setor, com busca pelo código, filtros e páginas (FR-010).
 *
 * Apara o código e a bateria e os omite quando ficam vazios: "sem filtro" e "filtro vazio" são a mesma
 * pergunta, e mandá-la de dois jeitos ao backend só multiplicaria o que ele precisa entender.
 */
@Injectable({ providedIn: 'root' })
export class SearchCagesUseCase {
  private readonly gateway = inject(CAGE_GATEWAY);

  execute(sectorId: string, search: CageSearch): Promise<Result<CagePage>> {
    const { code, battery, ...rest } = search;
    const trimmedCode = code?.trim();
    const trimmedBattery = battery?.trim();
    return this.gateway.searchCages(sectorId, {
      ...(trimmedCode ? { code: trimmedCode } : {}),
      ...(trimmedBattery ? { battery: trimmedBattery } : {}),
      ...rest,
    });
  }
}
