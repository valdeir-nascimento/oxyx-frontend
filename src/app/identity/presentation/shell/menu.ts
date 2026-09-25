import { MenuItem } from '../../../shared/presentation/layout/menu-item';
import { Role, isAdministrator } from '../../domain/authenticated-caretaker';

/** Item do menu e o perfil mínimo para vê-lo. */
interface ProtectedMenuItem extends MenuItem {
  readonly administratorOnly: boolean;
}

/** Itens do sistema, na ordem do menu. Cresce conforme os domínios seguintes forem entregues. */
const ITEMS: readonly ProtectedMenuItem[] = [
  { label: 'Início', route: '/', icon: 'chart', group: 'Painel', administratorOnly: false },
  { label: 'Responsáveis', route: '/responsaveis', icon: 'users', group: 'Administração', administratorOnly: true },
  // Todo perfil troca a própria senha (US4).
  { label: 'Trocar senha', route: '/minha-conta/senha', icon: 'lock', group: 'Minha conta', administratorOnly: false },
];

/**
 * O menu de quem está na sessão (FR-011): o usuário comum não vê a área administrativa.
 *
 * Esconder o item não é a proteção — quem protege é o backend, que responde 403. Isto evita
 * oferecer um caminho que terminaria em recusa.
 */
export function menuFor(role: Role): readonly MenuItem[] {
  return ITEMS.filter((item) => !item.administratorOnly || isAdministrator(role)).map(
    ({ label, route, icon, group }) => ({ label, route, icon, group }),
  );
}
