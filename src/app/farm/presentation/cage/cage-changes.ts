import { Injectable, signal } from '@angular/core';

/**
 * Aviso de que as gaiolas mudaram: o diálogo de cadastro e edição grava, e a lista, que continua
 * aberta por trás dele, busca de novo a página e os totais do setor.
 */
@Injectable({ providedIn: 'root' })
export class CageChanges {
  private readonly count = signal(0);

  readonly version = this.count.asReadonly();

  notify(): void {
    this.count.update((version) => version + 1);
  }
}
