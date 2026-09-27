import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { FeedFormula, FeedFormulaInput } from '../../domain/feed-formula';
import { FEED_FORMULA_GATEWAY } from './feed-formula-gateway';

/** Cadastra uma fórmula (FR-001 da 004). As regras, e todas as recusas de uma vez, são do backend. */
@Injectable({ providedIn: 'root' })
export class RegisterFeedFormulaUseCase {
  private readonly gateway = inject(FEED_FORMULA_GATEWAY);

  execute(input: FeedFormulaInput): Promise<Result<FeedFormula>> {
    return this.gateway.registerFeedFormula(input);
  }
}
