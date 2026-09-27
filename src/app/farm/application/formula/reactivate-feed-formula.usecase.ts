import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { FeedFormula } from '../../domain/feed-formula';
import { FEED_FORMULA_GATEWAY } from './feed-formula-gateway';

/** Reativa uma fórmula (FR-004 da 004). */
@Injectable({ providedIn: 'root' })
export class ReactivateFeedFormulaUseCase {
  private readonly gateway = inject(FEED_FORMULA_GATEWAY);

  execute(id: string): Promise<Result<FeedFormula>> {
    return this.gateway.reactivateFeedFormula(id);
  }
}
