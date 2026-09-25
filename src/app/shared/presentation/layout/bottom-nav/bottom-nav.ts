import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon } from '../../ui/icon/icon';
import { MenuItem } from '../menu-item';

/**
 * Navegação inferior do celular, a `.bnav` do design system: abaixo de 720 px o menu lateral some, e
 * as áreas ficam ao alcance do polegar. Acima disso, o design system a esconde.
 */
@Component({
  selector: 'ovyx-bottom-nav',
  imports: [RouterLink, RouterLinkActive, Icon],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNav {
  readonly items = input.required<readonly MenuItem[]>();
}
