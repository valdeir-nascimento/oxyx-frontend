import { Injectable, inject } from '@angular/core';
import { FILE_SAVER } from '../../../shared/application/file-saver';
import { Result, success } from '../../../shared/application/result';
import { DAILY_REPORT_GATEWAY } from './daily-report-gateway';

/**
 * Exporta os relatórios do setor num intervalo (US1 da 007): pede a planilha, salva no computador de quem usa
 * e devolve o nome do arquivo, para o aviso. As datas vão como digitadas: quem recusa é o backend.
 */
@Injectable({ providedIn: 'root' })
export class ExportDailyReportsUseCase {
  private readonly gateway = inject(DAILY_REPORT_GATEWAY);
  private readonly saver = inject(FILE_SAVER);

  async execute(sectorId: string, from: string, to: string): Promise<Result<string>> {
    const result = await this.gateway.exportDailyReports(sectorId, from, to);
    if (!result.success) {
      return result;
    }
    this.saver.save(result.value);
    return success(result.value.name);
  }
}
