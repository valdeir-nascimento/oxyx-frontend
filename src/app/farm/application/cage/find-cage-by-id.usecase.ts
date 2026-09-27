import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Cage } from '../../domain/cage';
import { CAGE_GATEWAY } from './cage-gateway';

/** Consulta uma gaiola do setor, ativa ou inativa. */
@Injectable({ providedIn: 'root' })
export class FindCageByIdUseCase {
  private readonly gateway = inject(CAGE_GATEWAY);

  execute(sectorId: string, cageId: string): Promise<Result<Cage>> {
    return this.gateway.findCage(sectorId, cageId);
  }
}
