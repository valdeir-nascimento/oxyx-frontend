import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from '../icon/icon';
import { Toaster } from './toaster';

/**
 * Pilha de toasts, o `.toasts` do design system, no canto da janela — acima da navegação inferior,
 * no celular.
 *
 * É uma região de estado (`role="status"`) que existe sempre, vazia ou não: leitor de tela costuma
 * não anunciar a região que já nasce preenchida (T235).
 */
@Component({
  selector: 'ovyx-toast-stack',
  imports: [Icon],
  templateUrl: './toast-stack.html',
  styleUrl: './toast-stack.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastStack {
  protected readonly toaster = inject(Toaster);
}
