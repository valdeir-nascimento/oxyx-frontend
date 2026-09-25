import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Sector } from '../../domain/sector';
import { SECTOR_GATEWAY } from './sector-gateway';

/** Inativa um setor e, junto, as gaiolas ativas dele (FR-015). Nada é apagado. */
@Injectable({ providedIn: 'root' })
export class DeactivateSectorUseCase {
  private readonly gateway = inject(SECTOR_GATEWAY);

  execute(id: string): Promise<Result<Sector>> {
    return this.gateway.deactivateSector(id);
  }
}
