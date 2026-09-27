import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { FeedFormula } from '../../domain/feed-formula';
import { StatusFilter } from '../../domain/status';
import { FEED_FORMULA_GATEWAY } from './feed-formula-gateway';

/** Lista as fórmulas da situação pedida, com o custo por ave ao dia (FR-005 da 004). */
@Injectable({ providedIn: 'root' })
export class ListFeedFormulasUseCase {
  private readonly gateway = inject(FEED_FORMULA_GATEWAY);

  execute(status: StatusFilter): Promise<Result<readonly FeedFormula[]>> {
    return this.gateway.listFeedFormulas(status);
  }
}
