import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { CaretakerDetail } from '../../domain/caretaker';
import { CARETAKER_GATEWAY } from './caretaker-gateway';

/** Inativação (FR-018, FR-019). O histórico fica; o último administrador ativo é recusado pelo backend. */
@Injectable({ providedIn: 'root' })
export class DeactivateCaretakerUseCase {
  private readonly gateway = inject(CARETAKER_GATEWAY);

  execute(id: string): Promise<Result<CaretakerDetail>> {
    return this.gateway.deactivate(id);
  }
}
