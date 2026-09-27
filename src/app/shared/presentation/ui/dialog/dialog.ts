import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FocusTrap } from '../focus-trap/focus-trap';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { IconName } from '../icon/icons';

let nextId = 0;

/**
 * Diálogo de formulário, o `.dialog` do design system: formulários curtos abrem sobre a página, e no
 * celular (abaixo de 640 px) viram folha inferior.
 *
 * É modal (`aria-modal`): o foco fica preso dentro dele, o Esc e o "Fechar" o encerram, e o foco
 * volta a quem o abriu (FocusTrap). O corpo recebe os campos projetados, em duas colunas; as ações
 * vêm projetadas com o atributo `dialog-actions`. O próprio diálogo é o `<form>`: o Enter num campo
 * envia, e quem usa recebe `submitted`, sem precisar tratar o evento nativo.
 *
 * ```html
 * <ovyx-dialog title="Novo responsável" icon="user" (submitted)="save()" (closed)="close()">
 *   <ovyx-form-field … />
 *   <ovyx-button dialog-actions variant="secondary" (pressed)="close()">Cancelar</ovyx-button>
 *   <ovyx-button dialog-actions type="submit">Salvar</ovyx-button>
 * </ovyx-dialog>
 * ```
 */
@Component({
  selector: 'ovyx-dialog',
  imports: [FocusTrap, Icon, IconButton],
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dialog {
  readonly title = input.required<string>();

  /** Uma frase sobre o que o diálogo faz, abaixo do título. */
  readonly subtitle = input<string>();

  readonly icon = input<IconName>('edit');

  /** Quem recebe o foco ao abrir; vazio, o primeiro campo do corpo. */
  readonly initialFocus = input('.dlg-body input, .dlg-body select, .dlg-body textarea');

  /** Pedido de fechar: pelo "Fechar", pelo Esc ou por um clique fora do diálogo. */
  readonly closed = output<void>();

  /** O formulário foi enviado, pelo botão de envio ou pelo Enter num campo. */
  readonly submitted = output<void>();

  protected readonly titleId = `ovyx-dialog-title-${++nextId}`;

  protected readonly subtitleId = `ovyx-dialog-subtitle-${nextId}`;

  /** Só o clique no fundo fecha; o clique dentro do diálogo chega aqui também, e é ignorado. */
  protected closeFromScrim(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.submitted.emit();
  }
}
