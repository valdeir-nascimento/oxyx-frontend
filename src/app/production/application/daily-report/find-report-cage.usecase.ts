import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { ReportCage } from '../../domain/daily-report';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';

/** Consulta uma gaiola do relatório, com os lançamentos, para o diálogo de lançamento. */
@Injectable({ providedIn: 'root' })
export class FindReportCageUseCase {
  private readonly gateway = inject(DAILY_REPORT_GATEWAY);

  execute(sectorId: string, reportId: string, cageId: string): Promise<Result<ReportCage>> {
    return this.gateway.findReportCage(sectorId, reportId, cageId);
  }
}
