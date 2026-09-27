import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Cage } from '../../domain/cage';
import { CAGE_GATEWAY } from './cage-gateway';

/** Inativa uma gaiola sozinha (FR-012): ela sai dos totais e continua consultável. */
@Injectable({ providedIn: 'root' })
export class DeactivateCageUseCase {
  private readonly gateway = inject(CAGE_GATEWAY);

  execute(sectorId: string, cageId: string): Promise<Result<Cage>> {
    return this.gateway.deactivateCage(sectorId, cageId);
  }
}
