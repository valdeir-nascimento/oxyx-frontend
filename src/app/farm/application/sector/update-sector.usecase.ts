import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Sector, SectorInput } from '../../domain/sector';
import { SECTOR_GATEWAY } from './sector-gateway';

/** Edita o nome e a descrição de um setor (FR-003), com as mesmas regras do cadastro. */
@Injectable({ providedIn: 'root' })
export class UpdateSectorUseCase {
  private readonly gateway = inject(SECTOR_GATEWAY);

  execute(id: string, input: SectorInput): Promise<Result<Sector>> {
    return this.gateway.updateSector(id, input);
  }
}
