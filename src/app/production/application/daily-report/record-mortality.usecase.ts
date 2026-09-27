import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { MortalityInput, ReportCage } from '../../domain/daily-report';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';

/** Lança ou corrige a mortalidade de uma gaiola do relatório, com os campos como foram digitados (FR-011). */
@Injectable({ providedIn: 'root' })
export class RecordMortalityUseCase {
  private readonly gateway = inject(DAILY_REPORT_GATEWAY);

  execute(sectorId: string, reportId: string, cageId: string, input: MortalityInput): Promise<Result<ReportCage>> {
    return this.gateway.recordMortality(sectorId, reportId, cageId, input);
  }
}
