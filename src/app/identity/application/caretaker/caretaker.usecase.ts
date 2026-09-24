import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import {
  CaretakerDetail,
  CaretakerPage,
  CaretakerRegistration,
  CaretakerSearch,
  CaretakerUpdate,
} from '../../domain/caretaker';
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

/** Consulta de um responsável, para o detalhe e a edição (FR-014). */
@Injectable({ providedIn: 'root' })
export class FindCaretakerUseCase {
  private readonly gateway = inject(CARETAKER_GATEWAY);

  execute(id: string): Promise<Result<CaretakerDetail>> {
    return this.gateway.find(id);
  }
}

/**
 * Cadastro de responsável (FR-013).
 *
 * Entrega ao backend exatamente o que foi digitado. As regras — e todas as falhas de uma vez
 * (FR-017) — são dele; repeti-las aqui faria o cliente recusar o que o backend aceita, ou o
 * contrário.
 */
@Injectable({ providedIn: 'root' })
export class RegisterCaretakerUseCase {
  private readonly gateway = inject(CARETAKER_GATEWAY);

  execute(registration: CaretakerRegistration): Promise<Result<CaretakerDetail>> {
    return this.gateway.register(registration);
  }
}

/** Edição de dados cadastrais e perfil (FR-014, FR-019). Pelo mesmo motivo do cadastro, não filtra nada. */
@Injectable({ providedIn: 'root' })
export class UpdateCaretakerUseCase {
  private readonly gateway = inject(CARETAKER_GATEWAY);

  execute(id: string, update: CaretakerUpdate): Promise<Result<CaretakerDetail>> {
    return this.gateway.update(id, update);
  }
}

/** Inativação (FR-018, FR-019). O histórico fica; o último administrador ativo é recusado pelo backend. */
@Injectable({ providedIn: 'root' })
export class DeactivateCaretakerUseCase {
  private readonly gateway = inject(CARETAKER_GATEWAY);

  execute(id: string): Promise<Result<CaretakerDetail>> {
    return this.gateway.deactivate(id);
  }
}
