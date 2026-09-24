import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
} from '@angular/core';
import { Button } from '../button/button';

let nextId = 0;

/**
 * Confirmação de uma ação que não se desfaz com um clique, como inativar um responsável (FR-018).
 *
 * Inline e não modal: aparece junto de onde a ação foi pedida, com `role="alertdialog"`, nomeado
 * pela pergunta e descrito pela consequência. Ao abrir, o foco vai para "Cancelar" — a escolha que
 * não muda nada, como o WAI-ARIA recomenda para diálogo de alerta —, e Escape também cancela.
 * Devolver o foco a quem abriu é de quem abriu, porque só ele sabe de onde veio.
 *
 * ```html
 * @if (confirming(); as caretaker) {
 *   <ovyx-confirm-dialog [title]="'Inativar ' + caretaker.fullName + '?'" confirmLabel="Inativar"
 *     (confirmed)="deactivate(caretaker)" (cancelled)="confirming.set(null)">
 *     Ele deixa de conseguir entrar no sistema.
 *   </ovyx-confirm-dialog>
 * }
 * ```
 */
@Component({
  selector: 'ovyx-confirm-dialog',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="confirm"
      role="alertdialog"
      aria-modal="false"
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="descriptionId"
      (keydown.escape)="cancelled.emit()"
    >
      <p class="confirm__title" [id]="titleId">{{ title() }}</p>
      <p class="confirm__description" [id]="descriptionId"><ng-content /></p>
      <div class="confirm__actions">
        <ovyx-button variant="danger" [busy]="busy()" (pressed)="confirmed.emit()">
          {{ confirmLabel() }}
        </ovyx-button>
        <ovyx-button variant="secondary" (pressed)="cancelled.emit()">Cancelar</ovyx-button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .confirm {
      display: grid;
      gap: var(--ovyx-space-2);
      padding: var(--ovyx-space-3);
      background-color: var(--ovyx-color-warning-surface);
      border: var(--ovyx-border-width-thick) solid var(--ovyx-color-warning-border);
      border-radius: var(--ovyx-radius-sm);
      color: var(--ovyx-color-warning-text);
    }

    .confirm__title {
      font-weight: var(--ovyx-font-weight-semibold);
    }

    .confirm__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ovyx-space-2);
    }
  `,
})
export class ConfirmDialog {
  /** A pergunta, que nomeia o diálogo. */
  readonly title = input.required<string>();

  /** O verbo da ação, no botão que a confirma. */
  readonly confirmLabel = input.required<string>();

  /** Verdadeiro enquanto a ação confirmada está em curso. */
  readonly busy = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly titleId = `ovyx-confirm-dialog-title-${++nextId}`;
  protected readonly descriptionId = `ovyx-confirm-dialog-description-${nextId}`;

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => {
      const buttons = host.nativeElement.querySelectorAll('button');
      buttons.item(buttons.length - 1)?.focus();
    });
  }
}
