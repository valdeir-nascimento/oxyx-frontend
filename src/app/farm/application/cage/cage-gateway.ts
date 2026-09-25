import { InjectionToken } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Cage, CageInput, CagePage, CageSearch } from '../../domain/cage';

/**
 * Porta das gaiolas, declarada na aplicação e implementada em `infrastructure`. A gaiola é recurso do
 * setor: toda operação leva o setor dela.
 */
export interface CageGateway {
  searchCages(sectorId: string, search: CageSearch): Promise<Result<CagePage>>;
  findCage(sectorId: string, cageId: string): Promise<Result<Cage>>;
  registerCage(sectorId: string, input: CageInput): Promise<Result<Cage>>;
  updateCage(sectorId: string, cageId: string, input: CageInput): Promise<Result<Cage>>;
  deactivateCage(sectorId: string, cageId: string): Promise<Result<Cage>>;
  reactivateCage(sectorId: string, cageId: string): Promise<Result<Cage>>;
}

export const CAGE_GATEWAY = new InjectionToken<CageGateway>('CageGateway');
