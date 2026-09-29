import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { WEIGHING_GATEWAY } from './weighing-gateway';

/**
 * Exclui uma pesagem (FR-006 da 005): o backend a anula e a guarda, com quem a anulou e quando. Nada é
 * apagado.
 */
@Injectable({ providedIn: 'root' })
export class VoidWeighingUseCase {
  private readonly gateway = inject(WEIGHING_GATEWAY);

  execute(sectorId: string, cageId: string, weighingId: string): Promise<Result<void>> {
    return this.gateway.voidWeighing(sectorId, cageId, weighingId);
  }
}
