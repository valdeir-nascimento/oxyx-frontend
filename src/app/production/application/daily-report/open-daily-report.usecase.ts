import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { DailyReport, DailyReportInput } from '../../domain/daily-report';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';

/** Abre o relatório do dia do setor, com os campos como foram digitados (FR-001). */
@Injectable({ providedIn: 'root' })
export class OpenDailyReportUseCase {
  private readonly gateway = inject(DAILY_REPORT_GATEWAY);

  execute(sectorId: string, input: DailyReportInput): Promise<Result<DailyReport>> {
    return this.gateway.openDailyReport(sectorId, input);
  }
}
