import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { ProductionInput, ReportCage } from '../../domain/daily-report';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';

/** Lança ou corrige a produção de uma gaiola do relatório, com os campos como foram digitados (FR-007). */
@Injectable({ providedIn: 'root' })
export class RecordProductionUseCase {
  private readonly gateway = inject(DAILY_REPORT_GATEWAY);

  execute(sectorId: string, reportId: string, cageId: string, input: ProductionInput): Promise<Result<ReportCage>> {
    return this.gateway.recordProduction(sectorId, reportId, cageId, input);
  }
}
