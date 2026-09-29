import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Weighing, WeighingInput } from '../../domain/weighing';
import { WEIGHING_GATEWAY } from './weighing-gateway';

/** Registra uma pesagem (FR-003 da 005). As regras, e todas as recusas de uma vez, são do backend. */
@Injectable({ providedIn: 'root' })
export class RecordWeighingUseCase {
  private readonly gateway = inject(WEIGHING_GATEWAY);

  execute(sectorId: string, cageId: string, input: WeighingInput): Promise<Result<Weighing>> {
    return this.gateway.recordWeighing(sectorId, cageId, input);
  }
}
