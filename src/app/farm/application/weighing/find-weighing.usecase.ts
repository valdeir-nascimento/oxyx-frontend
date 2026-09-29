import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Weighing } from '../../domain/weighing';
import { WEIGHING_GATEWAY } from './weighing-gateway';

/** Uma pesagem válida da gaiola, para o diálogo de correção (US4 da 005). */
@Injectable({ providedIn: 'root' })
export class FindWeighingUseCase {
  private readonly gateway = inject(WEIGHING_GATEWAY);

  execute(sectorId: string, cageId: string, weighingId: string): Promise<Result<Weighing>> {
    return this.gateway.findWeighing(sectorId, cageId, weighingId);
  }
}
