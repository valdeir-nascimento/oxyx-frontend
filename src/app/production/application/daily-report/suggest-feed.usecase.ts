import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { FeedSuggestion } from '../../domain/daily-report';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';

/** A proposta da ração do setor com a fórmula, antes de gravar (FR-009 da 004): o cálculo é do backend. */
@Injectable({ providedIn: 'root' })
export class SuggestFeedUseCase {
  private readonly gateway = inject(DAILY_REPORT_GATEWAY);

  execute(sectorId: string, reportId: string, formulaId: string): Promise<Result<FeedSuggestion>> {
    return this.gateway.suggestFeed(sectorId, reportId, formulaId);
  }
}
