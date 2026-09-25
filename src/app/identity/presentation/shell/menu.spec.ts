import { menuFor } from './menu';

/** O menu de quem está na sessão (FR-011), com o ícone e o grupo de cada item. */
describe('menuFor', () => {
  it('offers only the home to a common user', () => {
    expect(menuFor('USER')).toEqual([{ label: 'Início', route: '/', icon: 'chart', group: 'Painel' }]);
  });

  it('adds the caretaker administration for an administrator, under its own group', () => {
    expect(menuFor('ADMINISTRATOR')).toEqual([
      { label: 'Início', route: '/', icon: 'chart', group: 'Painel' },
      { label: 'Responsáveis', route: '/responsaveis', icon: 'users', group: 'Administração' },
    ]);
  });

  it('does not hand the layout the rule of who sees each item', () => {
    // O layout não conhece perfil (T233): o item chega sem o perfil mínimo para vê-lo.
    expect(menuFor('ADMINISTRATOR').every((item) => !('administratorOnly' in item))).toBe(true);
  });
});
