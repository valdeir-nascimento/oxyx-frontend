import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { CaretakerPage, CaretakerSearch } from '../../domain/caretaker';
import { CARETAKER_GATEWAY } from './caretaker-gateway';

/**
 * Pesquisa de responsáveis por trecho do nome (FR-014, cenário 5 da US2).
 *
 * Apara o trecho e o omite quando fica vazio: "sem filtro" e "filtro vazio" são a mesma pergunta, e
 * mandá-la de dois jeitos ao backend só multiplicaria o que ele precisa entender.
 */
@Injectable({ providedIn: 'root' })
export class SearchCaretakersUseCase {
  private readonly gateway = inject(CARETAKER_GATEWAY);

  execute(search: CaretakerSearch): Promise<Result<CaretakerPage>> {
    const { name, ...rest } = search;
    const fragment = name?.trim();
    return this.gateway.search(fragment ? { name: fragment, ...rest } : rest);
  }
}
