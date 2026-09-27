import { InjectionToken } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { FeedFormula, FeedFormulaInput } from '../../domain/feed-formula';
import { StatusFilter } from '../../domain/status';

/**
 * Porta das fórmulas de ração, declarada na aplicação e implementada em `infrastructure`. Toda recusa
 * do backend chega como `Result`, com as mensagens por campo.
 */
export interface FeedFormulaGateway {
  listFeedFormulas(status: StatusFilter): Promise<Result<readonly FeedFormula[]>>;
  findFeedFormula(id: string): Promise<Result<FeedFormula>>;
  registerFeedFormula(input: FeedFormulaInput): Promise<Result<FeedFormula>>;
  updateFeedFormula(id: string, input: FeedFormulaInput): Promise<Result<FeedFormula>>;
  deactivateFeedFormula(id: string): Promise<Result<FeedFormula>>;
  reactivateFeedFormula(id: string): Promise<Result<FeedFormula>>;
}

export const FEED_FORMULA_GATEWAY = new InjectionToken<FeedFormulaGateway>('FeedFormulaGateway');
