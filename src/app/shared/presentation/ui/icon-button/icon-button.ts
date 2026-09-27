import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Ação só de ícone, com o `.icon-btn` do design system: editar e inativar na linha, abrir o menu,
 * fechar um diálogo.
 *
 * Sem rótulo visível, o nome é obrigatório: vai em `aria-label` para o leitor de tela e em `title`
 * para quem passa o ponteiro. Deve dizer a ação e o alvo — "Inativar Maria Silva", e não "Inativar".
 */
@Component({
  selector: 'ovyx-icon-button',
  imports: [Icon],
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconButton {
  readonly icon = input.required<IconName>();

  /** O nome da ação, com o alvo quando se repete em cada linha. */
  readonly label = input.required<string>();

  /** 32 px, o tamanho das ações de linha de tabela. */
  readonly small = input(false);

  /** Ação que destrói ou inativa: o fundo de perigo aparece sob o ponteiro. */
  readonly danger = input(false);

  readonly type = input<'button' | 'submit'>('button');

  readonly disabled = input(false);

  /** Para o botão que abre e fecha outra região, como o menu no celular. */
  readonly expanded = input<boolean>();

  /** O id da região que o botão abre e fecha. */
  readonly controls = input<string>();

  readonly pressed = output<void>();
}
