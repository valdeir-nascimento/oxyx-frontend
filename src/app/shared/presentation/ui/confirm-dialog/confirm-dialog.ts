import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { FocusTrap } from '../focus-trap/focus-trap';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

let nextId = 0;

/**
 * Confirmação de uma ação que não se desfaz com um clique, como inativar (FR-018): o `.dialog.sm` do
 * design system, com a ação nomeada no botão — "Inativar", e não "Sim".
 *
 * É um `alertdialog` modal: o foco abre em "Cancelar", a escolha que não destrói; fica preso no
 * diálogo; o Esc e o clique fora cancelam; e ao fechar volta a quem abriu (FocusTrap). Enquanto a ação
 * corre (`busy`), nada cancela: o resultado já está a caminho.
 */
@Component({
  selector: 'ovyx-confirm-dialog',
  imports: [Button, FocusTrap, Icon],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  /** A pergunta, com o alvo: "Inativar Maria Silva?". */
  readonly title = input.required<string>();

  /** O nome da ação no botão de confirmar. */
  readonly confirmLabel = input.required<string>();

  readonly icon = input<IconName>('alert');

  /** Verdadeiro enquanto a ação confirmada corre. */
  readonly busy = input(false);

  readonly confirmed = output<void>();

  readonly cancelled = output<void>();

  protected readonly titleId = `ovyx-confirm-dialog-title-${++nextId}`;

  protected readonly messageId = `ovyx-confirm-dialog-message-${nextId}`;

  protected cancel(): void {
    if (!this.busy()) {
      this.cancelled.emit();
    }
  }

  protected cancelFromScrim(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancel();
    }
  }
}
