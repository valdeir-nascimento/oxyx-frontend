import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { FeedFormula } from '../../domain/feed-formula';
import { FEED_FORMULA_GATEWAY } from './feed-formula-gateway';

/** Consulta uma fórmula, ativa ou inativa. */
@Injectable({ providedIn: 'root' })
export class FindFeedFormulaUseCase {
  private readonly gateway = inject(FEED_FORMULA_GATEWAY);

  execute(id: string): Promise<Result<FeedFormula>> {
    return this.gateway.findFeedFormula(id);
  }
}
