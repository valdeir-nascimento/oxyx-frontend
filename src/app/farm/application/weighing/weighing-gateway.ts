import { InjectionToken } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { Weighing, WeighingInput, WeighingOverview } from '../../domain/weighing';

/**
 * Porta das pesagens, declarada na aplicação e implementada em `infrastructure`. Toda recusa do backend
 * chega como `Result`, com as mensagens por campo.
 */
export interface WeighingGateway {
  getWeighingOverview(sectorId: string, cageId: string): Promise<Result<WeighingOverview>>;
  recordWeighing(sectorId: string, cageId: string, input: WeighingInput): Promise<Result<Weighing>>;
  findWeighing(sectorId: string, cageId: string, weighingId: string): Promise<Result<Weighing>>;
  correctWeighing(
    sectorId: string,
    cageId: string,
    weighingId: string,
    input: WeighingInput,
  ): Promise<Result<Weighing>>;
  voidWeighing(sectorId: string, cageId: string, weighingId: string): Promise<Result<void>>;
}

export const WEIGHING_GATEWAY = new InjectionToken<WeighingGateway>('WeighingGateway');
