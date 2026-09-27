import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Sector } from '../../domain/sector';
import { SECTOR_GATEWAY } from './sector-gateway';

/** Reativa um setor e exatamente as gaiolas que a inativação dele levou (FR-015, FR-016). */
@Injectable({ providedIn: 'root' })
export class ReactivateSectorUseCase {
  private readonly gateway = inject(SECTOR_GATEWAY);

  execute(id: string): Promise<Result<Sector>> {
    return this.gateway.reactivateSector(id);
  }
}
