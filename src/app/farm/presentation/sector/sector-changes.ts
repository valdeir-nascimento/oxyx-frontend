import { Injectable, signal } from '@angular/core';

/**
 * Aviso de que os setores mudaram: o diálogo de cadastro e edição grava, e a lista, que continua
 * aberta por trás dele, se recarrega. É só um contador, como o dos responsáveis.
 */
@Injectable({ providedIn: 'root' })
export class SectorChanges {
  private readonly count = signal(0);

  readonly version = this.count.asReadonly();

  notify(): void {
    this.count.update((version) => version + 1);
  }
}
