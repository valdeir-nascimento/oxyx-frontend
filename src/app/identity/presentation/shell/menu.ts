import { MenuItem } from '../../../shared/domain/menu-item';
import { Role, isAdministrator } from '../../domain/authenticated-caretaker';

/** Item do menu e o perfil mínimo para vê-lo. */
interface ProtectedMenuItem extends MenuItem {
  readonly administratorOnly: boolean;
}

/** Itens do sistema. Cresce conforme os domínios seguintes forem entregues. */
const ITEMS: readonly ProtectedMenuItem[] = [
  { label: 'Início', route: '/', administratorOnly: false },
  { label: 'Responsáveis', route: '/responsaveis', administratorOnly: true },
];

/**
 * O menu de quem está na sessão (FR-011): o usuário comum não vê a área administrativa.
 *
 * Esconder o item não é a proteção — quem protege é o backend, que responde 403. Isto evita
 * oferecer um caminho que terminaria em recusa.
 */
export function menuFor(role: Role): readonly MenuItem[] {
  return ITEMS.filter((item) => !item.administratorOnly || isAdministrator(role)).map(
    ({ label, route }) => ({ label, route }),
  );
}
