import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { FeedInput, ReportCage } from '../../domain/daily-report';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';

/**
 * Lança ou corrige a ração de uma gaiola (FR-010 da 004): mantida a fórmula, o preço guardado continua;
 * trocada, a nova precisa estar ativa. As regras são do backend.
 */
@Injectable({ providedIn: 'root' })
export class RecordFeedUseCase {
  private readonly gateway = inject(DAILY_REPORT_GATEWAY);

  execute(
    sectorId: string,
    reportId: string,
    cageId: string,
    input: FeedInput,
  ): Promise<Result<ReportCage>> {
    return this.gateway.recordFeed(sectorId, reportId, cageId, input);
  }
}
