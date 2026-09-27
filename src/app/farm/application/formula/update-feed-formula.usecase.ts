import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { FeedFormula, FeedFormulaInput } from '../../domain/feed-formula';
import { FEED_FORMULA_GATEWAY } from './feed-formula-gateway';

/** Edita uma fórmula (FR-003 da 004): o preço novo vale para os lançamentos seguintes. */
@Injectable({ providedIn: 'root' })
export class UpdateFeedFormulaUseCase {
  private readonly gateway = inject(FEED_FORMULA_GATEWAY);

  execute(id: string, input: FeedFormulaInput): Promise<Result<FeedFormula>> {
    return this.gateway.updateFeedFormula(id, input);
  }
}
