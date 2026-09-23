import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MENU_ITEMS, MenuItem } from '../../domain/menu-item';

/**
 * Navegação do sistema, filtrada por perfil (FR-011).
 *
 * Recebe o perfil como entrada em vez de consultar um serviço de identidade: assim
 * `shared/presentation` não passa a depender do contexto `identity`, e a regra de dependência
 * entre camadas continua valendo também no cliente.
 */
@Component({
  selector: 'ovyx-navigation',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Navegação principal">
      <ul class="navigation">
        @for (item of visibleItems(); track item.route) {
          <li class="navigation__item">
            <a
              class="navigation__link"
              [routerLink]="item.route"
              routerLinkActive="navigation__link--active"
              [routerLinkActiveOptions]="{ exact: item.route === '/' }"
            >
              {{ item.label }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: `
    /* Com as áreas futuras, a lista não cabe na largura de um telefone. Ela rola na
     * horizontal em vez de empilhar: empilhar empurraria o conteúdo da página para
     * baixo a cada área nova. Acima de cinco itens o padrão muda para menu
     * recolhido — está registrado no catálogo, e entra quando houver o sexto. */
    .navigation {
      display: flex;
      flex-wrap: nowrap;
      gap: var(--ovyx-space-4);
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scrollbar-width: thin;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .navigation__item {
      flex: none;
    }

    .navigation__link {
      display: inline-flex;
      align-items: center;
      min-height: var(--ovyx-control-height-md);
      padding: 0 var(--ovyx-space-2);
      border-radius: var(--ovyx-radius-sm);
      color: var(--ovyx-color-text);
      text-decoration: none;
    }

    .navigation__link:hover {
      background-color: var(--ovyx-color-surface-sunken);
    }

    /* A área em que se está não é dita só por cor: o peso muda e um traço marca o item. */
    .navigation__link--active {
      font-weight: var(--ovyx-font-weight-semibold);
      color: var(--ovyx-color-brand-text);
      box-shadow: inset 0 calc(var(--ovyx-border-width-thick) * -1) 0 0 currentcolor;
    }
  `,
})
export class Navigation {
  /** Perfil de quem está autenticado. `ADMINISTRATOR` libera a área administrativa. */
  readonly role = input.required<'ADMINISTRATOR' | 'USER'>();

  protected readonly visibleItems = computed<readonly MenuItem[]>(() => {
    const isAdministrator = this.role() === 'ADMINISTRATOR';
    return MENU_ITEMS.filter((item) => !item.administratorOnly || isAdministrator);
  });
}
