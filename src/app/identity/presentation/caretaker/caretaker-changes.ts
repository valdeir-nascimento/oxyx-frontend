import { Injectable, signal } from '@angular/core';

/**
 * Aviso de que o cadastro de responsáveis mudou: o diálogo de cadastro e edição grava, e a lista,
 * que continua aberta por trás dele, se recarrega.
 *
 * É só um contador. O que mudou a pessoa lê no toast; a lista só precisa saber que deve buscar de
 * novo a página em que está.
 */
@Injectable({ providedIn: 'root' })
export class CaretakerChanges {
  private readonly count = signal(0);

  readonly version = this.count.asReadonly();

  notify(): void {
    this.count.update((version) => version + 1);
  }
}
