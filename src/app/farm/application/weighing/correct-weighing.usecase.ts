import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Weighing, WeighingInput } from '../../domain/weighing';
import { WEIGHING_GATEWAY } from './weighing-gateway';

/** Corrige uma pesagem (FR-005 da 005). As regras, e todas as recusas de uma vez, são do backend. */
@Injectable({ providedIn: 'root' })
export class CorrectWeighingUseCase {
  private readonly gateway = inject(WEIGHING_GATEWAY);

  execute(
    sectorId: string,
    cageId: string,
    weighingId: string,
    input: WeighingInput,
  ): Promise<Result<Weighing>> {
    return this.gateway.correctWeighing(sectorId, cageId, weighingId, input);
  }
}
