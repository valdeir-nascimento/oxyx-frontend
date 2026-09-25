import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Sector } from '../../domain/sector';
import { SECTOR_GATEWAY } from './sector-gateway';

/** Consulta um setor, ativo ou inativo, com os totais. */
@Injectable({ providedIn: 'root' })
export class FindSectorByIdUseCase {
  private readonly gateway = inject(SECTOR_GATEWAY);

  execute(id: string): Promise<Result<Sector>> {
    return this.gateway.findSector(id);
  }
}
