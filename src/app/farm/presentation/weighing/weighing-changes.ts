import { Injectable, signal } from '@angular/core';

/**
 * Aviso de que uma pesagem mudou: o diálogo registra ou corrige, a tela exclui, e a tela Peso médio lê de
 * novo o acompanhamento, com as contas que o backend refez.
 */
@Injectable({ providedIn: 'root' })
export class WeighingChanges {
  private readonly count = signal(0);

  readonly version = this.count.asReadonly();

  notify(): void {
    this.count.update((version) => version + 1);
  }
}
