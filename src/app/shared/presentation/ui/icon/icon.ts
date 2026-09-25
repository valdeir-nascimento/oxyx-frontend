import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONS, IconName, IconShape } from './icons';

/** Tamanhos do design system: 16, 18, 20 (o padrão) e 24 px. */
export type IconSize = 16 | 18 | 20 | 24;

/**
 * Ícone do design system: um `<svg class="i">` de traço, que herda a cor do texto.
 *
 * É sempre decorativo (`aria-hidden`): quem dá nome à ação é o botão ou o link que o envolve — um
 * botão só de ícone leva `aria-label`. O elemento do componente não ocupa caixa (`display:
 * contents`), para o `<svg>` ser o filho direto do `.control`, do `.btn` ou do `.nav-item`, como no
 * design system.
 *
 * ```html
 * <ovyx-icon name="plus" [size]="18" />
 * ```
 */
@Component({
  selector: 'ovyx-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<IconName>();

  readonly size = input<IconSize>(20);

  /** As formas do ícone pelo tipo geral, para o template tratar o tracejado, que só o `box` tem. */
  protected readonly shapes = computed<readonly IconShape[]>(() => ICONS[this.name()]);
}
