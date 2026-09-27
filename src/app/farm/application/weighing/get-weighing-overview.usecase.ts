import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { WeighingOverview } from '../../domain/weighing';
import { WEIGHING_GATEWAY } from './weighing-gateway';

/** O acompanhamento do peso de uma gaiola (FR-009 a FR-011 da 005). As contas são do backend. */
@Injectable({ providedIn: 'root' })
export class GetWeighingOverviewUseCase {
  private readonly gateway = inject(WEIGHING_GATEWAY);

  execute(sectorId: string, cageId: string): Promise<Result<WeighingOverview>> {
    return this.gateway.getWeighingOverview(sectorId, cageId);
  }
}
