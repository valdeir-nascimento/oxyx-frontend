import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { DailyReportSuggestion } from '../../domain/daily-report';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';

/** Pede os valores sugeridos para o relatório novo do setor (FR-004). */
@Injectable({ providedIn: 'root' })
export class SuggestDailyReportUseCase {
  private readonly gateway = inject(DAILY_REPORT_GATEWAY);

  execute(sectorId: string): Promise<Result<DailyReportSuggestion>> {
    return this.gateway.suggestDailyReport(sectorId);
  }
}
