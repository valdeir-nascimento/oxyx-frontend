import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Estado vazio, o `.empty` do design system: o que aconteceu e o próximo passo, em vez de um
 * "Nenhum registro" solto.
 *
 * O título é um `<h2>`, ou um `<h1>` quando o estado vazio é a página toda — o design system desenha
 * um `<h4>`, mas pular níveis de título confunde quem navega por eles; a aparência é a mesma
 * (extensions.css). Uma ação, se houver, vem projetada.
 */
@Component({
  selector: 'ovyx-empty-state',
  imports: [Icon],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly title = input.required<string>();

  readonly message = input<string>();

  readonly icon = input<IconName>('box');

  /** O nível do título: 2 dentro de uma página com `<h1>`; 1 quando o estado vazio é a página toda. */
  readonly level = input<1 | 2>(2);
}
