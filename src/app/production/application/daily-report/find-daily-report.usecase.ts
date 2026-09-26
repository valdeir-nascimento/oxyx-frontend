import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { DailyReport } from '../../domain/daily-report';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';

/** Consulta um relatório do setor, com as gaiolas e os totais do dia. */
@Injectable({ providedIn: 'root' })
export class FindDailyReportUseCase {
  private readonly gateway = inject(DAILY_REPORT_GATEWAY);

  execute(sectorId: string, reportId: string): Promise<Result<DailyReport>> {
    return this.gateway.findDailyReport(sectorId, reportId);
  }
}
