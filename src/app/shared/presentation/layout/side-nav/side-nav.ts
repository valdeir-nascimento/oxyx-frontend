import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Avatar } from '../../ui/avatar/avatar';
import { Brand } from '../../ui/brand/brand';
import { Icon } from '../../ui/icon/icon';
import { MenuItem } from '../menu-item';

/** Os itens de um grupo do menu, na ordem em que chegaram. */
interface MenuGroup {
  readonly name: string;
  readonly items: readonly MenuItem[];
}

/**
 * Menu lateral, o `.side` do design system: a marca, quem está na sessão, os itens agrupados e a
 * saída.
 *
 * O elemento do componente é o próprio `.side` (classe no host), porque o design system o encolhe
 * em trilho de ícones pelo seletor `.app > .side` — um `<aside>` dentro do componente ficaria um
 * nível abaixo e escaparia da regra. O mesmo componente aparece na gaveta do celular.
 */
@Component({
  selector: 'ovyx-side-nav',
  imports: [RouterLink, RouterLinkActive, Avatar, Brand, Icon],
  templateUrl: './side-nav.html',
  styleUrl: './side-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'side' },
})
export class SideNav {
  readonly fullName = input.required<string>();

  /** O perfil já em português; o menu não conhece perfil (T233). */
  readonly roleLabel = input.required<string>();

  readonly menuItems = input.required<readonly MenuItem[]>();

  readonly signOut = output<void>();

  protected readonly groups = computed(() =>
    this.menuItems().reduce<MenuGroup[]>((groups, item) => {
      const last = groups[groups.length - 1];
      if (last?.name === item.group) {
        return [...groups.slice(0, -1), { name: last.name, items: [...last.items, item] }];
      }
      return [...groups, { name: item.group, items: [item] }];
    }, []),
  );
}
