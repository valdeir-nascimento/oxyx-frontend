import { IconName } from '../ui/icon/icons';

/**
 * Item de navegação: o que a pessoa lê, para onde ele leva, o ícone e o grupo em que aparece no menu
 * lateral ("Painel", "Administração").
 *
 * Não diz quem pode ver o item. Essa decisão é do contexto que monta o menu — hoje, a casca de
 * `identity`, que conhece o perfil de quem está na sessão —, para que `shared` não conheça perfil
 * (T233). Esconder o item também não é a proteção: quem protege é o backend.
 */
export interface MenuItem {
  readonly label: string;
  readonly route: string;
  readonly icon: IconName;
  readonly group: string;
}
