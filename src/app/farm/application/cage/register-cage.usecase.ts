import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Cage, CageInput } from '../../domain/cage';
import { CAGE_GATEWAY } from './cage-gateway';

/** Cadastra uma gaiola no setor (FR-006). As regras, e todas as recusas de uma vez, são do backend. */
@Injectable({ providedIn: 'root' })
export class RegisterCageUseCase {
  private readonly gateway = inject(CAGE_GATEWAY);

  execute(sectorId: string, input: CageInput): Promise<Result<Cage>> {
    return this.gateway.registerCage(sectorId, input);
  }
}
