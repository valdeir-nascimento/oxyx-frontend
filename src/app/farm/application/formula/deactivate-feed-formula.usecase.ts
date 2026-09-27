import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { FeedFormula } from '../../domain/feed-formula';
import { FEED_FORMULA_GATEWAY } from './feed-formula-gateway';

/** Inativa uma fórmula (FR-004 da 004): ela sai dos lançamentos novos, e nada é apagado. */
@Injectable({ providedIn: 'root' })
export class DeactivateFeedFormulaUseCase {
  private readonly gateway = inject(FEED_FORMULA_GATEWAY);

  execute(id: string): Promise<Result<FeedFormula>> {
    return this.gateway.deactivateFeedFormula(id);
  }
}
