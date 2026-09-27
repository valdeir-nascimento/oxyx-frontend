import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { CaretakerDetail } from '../../domain/caretaker';
import { CARETAKER_GATEWAY } from './caretaker-gateway';

/** Consulta de um responsável pelo identificador, para o detalhe e a edição (FR-014). */
@Injectable({ providedIn: 'root' })
export class FindCaretakerByIdUseCase {
  private readonly gateway = inject(CARETAKER_GATEWAY);

  execute(id: string): Promise<Result<CaretakerDetail>> {
    return this.gateway.find(id);
  }
}
