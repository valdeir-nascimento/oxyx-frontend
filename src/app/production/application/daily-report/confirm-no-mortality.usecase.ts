import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { DailyReport } from '../../domain/daily-report';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';

/** Confirma que o dia do relatório não teve mortes nem descartes (FR-013). */
@Injectable({ providedIn: 'root' })
export class ConfirmNoMortalityUseCase {
  private readonly gateway = inject(DAILY_REPORT_GATEWAY);

  execute(sectorId: string, reportId: string): Promise<Result<DailyReport>> {
    return this.gateway.confirmNoMortality(sectorId, reportId);
  }
}
