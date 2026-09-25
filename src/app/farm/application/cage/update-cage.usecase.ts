import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Cage, CageInput } from '../../domain/cage';
import { CAGE_GATEWAY } from './cage-gateway';

/** Edita a bateria, o número e as aves de uma gaiola (FR-009). O setor da gaiola não muda. */
@Injectable({ providedIn: 'root' })
export class UpdateCageUseCase {
  private readonly gateway = inject(CAGE_GATEWAY);

  execute(sectorId: string, cageId: string, input: CageInput): Promise<Result<Cage>> {
    return this.gateway.updateCage(sectorId, cageId, input);
  }
}
