import { InjectionToken } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Sector, SectorInput, SectorSummary } from '../../domain/sector';
import { StatusFilter } from '../../domain/status';

/**
 * Porta dos setores, declarada na aplicação e implementada em `infrastructure`. Toda recusa do
 * backend chega como `Result`, com as mensagens por campo.
 */
export interface SectorGateway {
  listSectors(status: StatusFilter): Promise<Result<readonly SectorSummary[]>>;
  findSector(id: string): Promise<Result<Sector>>;
  registerSector(input: SectorInput): Promise<Result<Sector>>;
  updateSector(id: string, input: SectorInput): Promise<Result<Sector>>;
  deactivateSector(id: string): Promise<Result<Sector>>;
  reactivateSector(id: string): Promise<Result<Sector>>;
}

export const SECTOR_GATEWAY = new InjectionToken<SectorGateway>('SectorGateway');
