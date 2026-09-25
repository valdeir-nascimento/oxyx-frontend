import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { CaretakerDetail, CaretakerUpdate } from '../../domain/caretaker';
import { CARETAKER_GATEWAY } from './caretaker-gateway';

/** Edição de dados cadastrais e perfil (FR-014, FR-019). Pelo mesmo motivo do cadastro, não filtra nada. */
@Injectable({ providedIn: 'root' })
export class UpdateCaretakerUseCase {
  private readonly gateway = inject(CARETAKER_GATEWAY);

  execute(id: string, update: CaretakerUpdate): Promise<Result<CaretakerDetail>> {
    return this.gateway.update(id, update);
  }
}
