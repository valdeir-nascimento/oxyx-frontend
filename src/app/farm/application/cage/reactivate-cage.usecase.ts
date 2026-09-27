import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Cage } from '../../domain/cage';
import { CAGE_GATEWAY } from './cage-gateway';

/** Reativa uma gaiola sozinha; recusada com o setor inativo ou o código tomado (FR-015, FR-016). */
@Injectable({ providedIn: 'root' })
export class ReactivateCageUseCase {
  private readonly gateway = inject(CAGE_GATEWAY);

  execute(sectorId: string, cageId: string): Promise<Result<Cage>> {
    return this.gateway.reactivateCage(sectorId, cageId);
  }
}
