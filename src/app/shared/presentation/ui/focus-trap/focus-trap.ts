import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Prende o foco dentro de um diálogo modal enquanto ele estiver aberto (WAI-ARIA, padrão de diálogo).
 *
 * Ao abrir, leva o foco ao elemento indicado pelo seletor — ou ao primeiro que recebe foco —; o Tab e
 * o Shift+Tab circulam entre os elementos do diálogo, sem vazar para a página por trás; ao fechar,
 * devolve o foco a quem estava com ele quando o diálogo abriu, em geral o botão que o abriu.
 *
 * ```html
 * <div class="dialog" role="dialog" aria-modal="true" [ovyxFocusTrap]="'.dlg-body input'">…</div>
 * ```
 */
@Directive({
  selector: '[ovyxFocusTrap]',
  host: { '(keydown.tab)': 'cycle($event)', '(keydown.shift.tab)': 'cycle($event)' },
})
export class FocusTrap {
  /** Seletor de quem recebe o foco ao abrir; vazio, o primeiro elemento focável. */
  readonly ovyxFocusTrap = input('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Quem estava com o foco antes de o diálogo abrir. */
  private readonly opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  constructor() {
    afterNextRender(() => this.focusInitial());
    // Se quem abriu já não está na página — o botão de inativar some com a inativação —, quem usa o
    // diálogo decide para onde vai o foco.
    inject(DestroyRef).onDestroy(() => {
      if (this.opener?.isConnected) {
        this.opener.focus();
      }
    });
  }

  protected cycle(event: Event): void {
    const focusables = this.focusables();
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const backwards = (event as KeyboardEvent).shiftKey;

    if (backwards && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!backwards && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusInitial(): void {
    const selector = this.ovyxFocusTrap();
    const target = (selector ? this.host.querySelector<HTMLElement>(selector) : null) ?? this.focusables()[0];
    target?.focus();
  }

  private focusables(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>(FOCUSABLE));
  }
}
