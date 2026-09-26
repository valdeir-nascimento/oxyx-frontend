import { Injectable, signal } from '@angular/core';
import { DailyReport } from '../../domain/daily-report';

/**
 * O relatório que a página carregou, para as abas e os diálogos dentro dela: a página busca, e eles
 * leem. Fornecido pela página do relatório, e não pela raiz: cada página tem o seu.
 */
@Injectable()
export class ReportView {
  readonly report = signal<DailyReport | null>(null);
}
