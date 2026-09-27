import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { DailyReport, DailyReportInput } from '../../domain/daily-report';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';

/** Corrige os dados gerais de um relatório, com os campos como foram digitados (FR-003). */
@Injectable({ providedIn: 'root' })
export class CorrectDailyReportUseCase {
  private readonly gateway = inject(DAILY_REPORT_GATEWAY);

  execute(sectorId: string, reportId: string, input: DailyReportInput): Promise<Result<DailyReport>> {
    return this.gateway.correctDailyReport(sectorId, reportId, input);
  }
}
