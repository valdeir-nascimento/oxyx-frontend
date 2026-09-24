import { Injectable, signal } from '@angular/core';

/**
 * Aviso de uma tela para a seguinte, uma única vez: o formulário salva e a lista diz o que
 * aconteceu.
 *
 * Fica em memória, e não no endereço, de propósito: recarregar a lista não deve repetir "responsável
 * cadastrado" sobre um cadastro que já é passado.
 */
@Injectable({ providedIn: 'root' })
export class CaretakerNotice {
  private readonly message = signal<string | null>(null);

  post(message: string): void {
    this.message.set(message);
  }

  /** Lê o aviso e o esquece. */
  take(): string | null {
    const message = this.message();
    this.message.set(null);
    return message;
  }
}
