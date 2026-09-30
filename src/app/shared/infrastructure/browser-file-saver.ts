import { DOCUMENT, Injectable, inject } from '@angular/core';
import { FileSaver } from '../application/file-saver';
import { SpreadsheetFile } from '../application/spreadsheet-file';

/**
 * Salva o arquivo baixado pelo navegador (R-014 da 007): um link temporário com o nome do arquivo e o
 * endereço do Blob, clicado e retirado do documento. O endereço é revogado depois do clique, e não antes,
 * porque o navegador ainda lê o Blob quando o clique volta.
 */
@Injectable({ providedIn: 'root' })
export class BrowserFileSaver implements FileSaver {
  private readonly document = inject(DOCUMENT);

  save(file: SpreadsheetFile): void {
    const address = URL.createObjectURL(file.content);
    const link = this.document.createElement('a');
    link.href = address;
    link.download = file.name;
    link.hidden = true;
    this.document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(address));
    }
  }
}
