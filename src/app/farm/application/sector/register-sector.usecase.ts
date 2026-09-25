import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Sector, SectorInput } from '../../domain/sector';
import { SECTOR_GATEWAY } from './sector-gateway';

/** Cadastra um setor (FR-001). As regras, e todas as recusas de uma vez, são do backend (FR-017). */
@Injectable({ providedIn: 'root' })
export class RegisterSectorUseCase {
  private readonly gateway = inject(SECTOR_GATEWAY);

  execute(input: SectorInput): Promise<Result<Sector>> {
    return this.gateway.registerSector(input);
  }
}
