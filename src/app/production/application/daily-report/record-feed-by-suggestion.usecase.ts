import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { DailyReport } from '../../domain/daily-report';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';

/** Lança a ração do setor pela sugestão da fórmula (FR-009 da 004): as gaiolas já lançadas não mudam. */
@Injectable({ providedIn: 'root' })
export class RecordFeedBySuggestionUseCase {
  private readonly gateway = inject(DAILY_REPORT_GATEWAY);

  execute(sectorId: string, reportId: string, formulaId: string): Promise<Result<DailyReport>> {
    return this.gateway.recordFeedBySuggestion(sectorId, reportId, formulaId);
  }
}
