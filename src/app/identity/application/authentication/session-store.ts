import { Injectable, computed, signal } from '@angular/core';
import { AuthenticatedCaretaker } from '../../domain/authenticated-caretaker';

/**
 * Quem está na sessão, como o cliente precisa saber.
 *
 * Guarda a **identidade**, não a sessão: esta vive no cookie do navegador, e quem a cria e a
 * invalida é o backend (FR-004).
 *
 * O que existe aqui é o que a casca desenha e o que o guard de rota consulta — por isso nada de
 * senha, nada de token e nada gravado em `localStorage`. O interceptador de sessão chama
 * `forget()` quando o backend recusa a sessão (FR-003).
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly current = signal<AuthenticatedCaretaker | null>(null);

  readonly caretaker = this.current.asReadonly();

  /** Verdadeiro enquanto a senha provisória não for trocada (FR-025). */
  readonly mustChangePassword = computed(() => this.current()?.mustChangePassword === true);

  remember(caretaker: AuthenticatedCaretaker): void {
    this.current.set(caretaker);
  }

  forget(): void {
    this.current.set(null);
  }

  /**
   * Desfaz a obrigação de trocar a senha, mantendo a sessão.
   *
   * A mesma sessão continua valendo após a troca (V-05): exigir uma nova entrada aqui contrariaria
   * o que o backend faz.
   */
  markPasswordChanged(): void {
    this.current.update((caretaker) =>
      caretaker ? { ...caretaker, mustChangePassword: false } : null,
    );
  }
}
