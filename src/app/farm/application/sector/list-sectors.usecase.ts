import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { SectorSummary } from '../../domain/sector';
import { StatusFilter } from '../../domain/status';
import { SECTOR_GATEWAY } from './sector-gateway';

/** Lista os setores da situação pedida, com os totais das gaiolas ativas (FR-004, FR-005). */
@Injectable({ providedIn: 'root' })
export class ListSectorsUseCase {
  private readonly gateway = inject(SECTOR_GATEWAY);

  execute(status: StatusFilter): Promise<Result<readonly SectorSummary[]>> {
    return this.gateway.listSectors(status);
  }
}
