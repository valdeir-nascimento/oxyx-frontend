import { Injectable, inject } from '@angular/core';
import { FILE_SAVER } from '../../../shared/application/file-saver';
import { Result, success } from '../../../shared/application/result';
import { CageExport } from '../../domain/cage';
import { CAGE_GATEWAY } from './cage-gateway';

/**
 * Exporta as gaiolas do setor com os filtros da lista (US3 da 007): pede a planilha, salva no computador de quem
 * usa e devolve o nome do arquivo, para o aviso.
 */
@Injectable({ providedIn: 'root' })
export class ExportCagesUseCase {
  private readonly gateway = inject(CAGE_GATEWAY);
  private readonly saver = inject(FILE_SAVER);

  async execute(sectorId: string, filters: CageExport): Promise<Result<string>> {
    const result = await this.gateway.exportCages(sectorId, filters);
    if (!result.success) {
      return result;
    }
    this.saver.save(result.value);
    return success(result.value.name);
  }
}
