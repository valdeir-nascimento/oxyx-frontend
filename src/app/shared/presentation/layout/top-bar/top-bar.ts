import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../../ui/icon/icon';

/**
 * Barra superior, a `.topbar` do design system: o caminho até a página no computador; no celular, o
 * botão do menu e o título da página.
 *
 * O botão do menu diz se a gaveta está aberta (`aria-expanded`) e qual região ele controla.
 */
@Component({
  selector: 'ovyx-top-bar',
  imports: [Icon],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBar {
  /** O caminho até a página, da área mais ampla até ela: ["Administração", "Responsáveis"]. */
  readonly crumbs = input.required<readonly string[]>();

  readonly menuOpen = input(false);

  /** O `id` da gaveta que o botão do menu abre. */
  readonly menuId = input.required<string>();

  readonly menuToggle = output<void>();

  protected readonly current = computed(() => this.crumbs().at(-1) ?? '');

  protected readonly parents = computed(() => this.crumbs().slice(0, -1));
}
