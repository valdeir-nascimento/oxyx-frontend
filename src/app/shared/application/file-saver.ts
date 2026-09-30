import { InjectionToken } from '@angular/core';
import { SpreadsheetFile } from './spreadsheet-file';

/**
 * Salva no computador de quem usa um arquivo baixado (R-014 da 007).
 *
 * É porta porque salvar mexe no navegador: nenhum componente nem caso de uso cria link no DOM para baixar. O
 * `shared/infrastructure` fornece a implementação.
 */
export interface FileSaver {
  save(file: SpreadsheetFile): void;
}

export const FILE_SAVER = new InjectionToken<FileSaver>('FileSaver');
