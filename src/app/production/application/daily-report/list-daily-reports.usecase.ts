import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { DailyReportPage, DailyReportSearch } from '../../domain/daily-report';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';

/** Lista os relatórios do setor, do dia mais recente para o mais antigo (FR-016). */
@Injectable({ providedIn: 'root' })
export class ListDailyReportsUseCase {
  private readonly gateway = inject(DAILY_REPORT_GATEWAY);

  execute(sectorId: string, search: DailyReportSearch): Promise<Result<DailyReportPage>> {
    return this.gateway.listDailyReports(sectorId, search);
  }
}
