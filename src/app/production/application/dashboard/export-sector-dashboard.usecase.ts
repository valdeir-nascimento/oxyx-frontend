import { Injectable, inject } from '@angular/core';
import { FILE_SAVER } from '../../../shared/application/file-saver';
import { Result, success } from '../../../shared/application/result';
import { DashboardPeriod } from '../../domain/dashboard';
import { DASHBOARD_GATEWAY } from './dashboard-gateway';

/**
 * Exporta o painel do setor no período (US2 da 007): pede a planilha, salva no computador de quem usa e
 * devolve o nome do arquivo, para o aviso.
 */
@Injectable({ providedIn: 'root' })
export class ExportSectorDashboardUseCase {
  private readonly gateway = inject(DASHBOARD_GATEWAY);
  private readonly saver = inject(FILE_SAVER);

  async execute(sectorId: string, period: DashboardPeriod): Promise<Result<string>> {
    const result = await this.gateway.exportSectorDashboard(sectorId, period);
    if (!result.success) {
      return result;
    }
    this.saver.save(result.value);
    return success(result.value.name);
  }
}
