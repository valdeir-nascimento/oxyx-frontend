import { Injectable, signal } from '@angular/core';

/**
 * Aviso de que um relatório mudou: o diálogo grava, e a lista ou a página do relatório, que continua
 * aberta por trás dele, busca de novo.
 */
@Injectable({ providedIn: 'root' })
export class ReportChanges {
  private readonly count = signal(0);

  readonly version = this.count.asReadonly();

  notify(): void {
    this.count.update((version) => version + 1);
  }
}
