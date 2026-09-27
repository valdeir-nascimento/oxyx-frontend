import { Injectable, signal } from '@angular/core';

/** Sucesso confirma uma ação; perigo avisa que ela não aconteceu. */
export type ToastTone = 'success' | 'danger';

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
}

/** Quanto tempo o toast fica na tela. A mesma informação continua visível na própria tela. */
const DURATION_MS = 6000;

/**
 * Toasts, como o design system os define: o aviso fica na página enquanto a condição existir, e o
 * toast confirma uma ação — "Responsável cadastrado: Maria Silva." — e some sozinho.
 *
 * Qualquer tela chama `show`; a pilha (`ovyx-toast-stack`) fica na raiz da aplicação, numa região de
 * estado que existe desde o início, para o leitor de tela anunciar cada toast novo.
 */
@Injectable({ providedIn: 'root' })
export class Toaster {
  private readonly items = signal<readonly Toast[]>([]);

  private nextId = 0;

  readonly toasts = this.items.asReadonly();

  show(message: string, tone: ToastTone = 'success', durationMs = DURATION_MS): void {
    const toast: Toast = { id: ++this.nextId, message, tone };
    this.items.update((toasts) => [...toasts, toast]);
    setTimeout(() => this.dismiss(toast.id), durationMs);
  }

  dismiss(id: number): void {
    this.items.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
