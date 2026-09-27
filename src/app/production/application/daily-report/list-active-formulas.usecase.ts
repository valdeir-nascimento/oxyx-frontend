import { Injectable, inject } from '@angular/core';
import { Result } from '../../../shared/application/result';
import { FeedFormulaOption } from '../../domain/daily-report';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';

/** As fórmulas ativas, que o lançamento de ração oferece (feature 004, R-013). */
@Injectable({ providedIn: 'root' })
export class ListActiveFormulasUseCase {
  private readonly gateway = inject(DAILY_REPORT_GATEWAY);

  execute(): Promise<Result<readonly FeedFormulaOption[]>> {
    return this.gateway.listActiveFormulas();
  }
}
