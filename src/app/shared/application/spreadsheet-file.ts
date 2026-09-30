/**
 * Uma planilha baixada (R-014 da 007): o nome com que ela é salva e o conteúdo do arquivo .xlsx.
 */
export interface SpreadsheetFile {
  readonly name: string;
  readonly content: Blob;
}
