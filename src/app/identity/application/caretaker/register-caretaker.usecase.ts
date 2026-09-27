import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { CaretakerDetail, CaretakerRegistration } from '../../domain/caretaker';
import { CARETAKER_GATEWAY } from './caretaker-gateway';

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
