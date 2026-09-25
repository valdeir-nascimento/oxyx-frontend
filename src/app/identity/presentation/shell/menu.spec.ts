import { menuFor } from './menu';

const HOME = { label: 'Início', route: '/', icon: 'chart', group: 'Painel' };
const SECTORS = { label: 'Setores', route: '/setores', icon: 'barn', group: 'Produção' };
const CARETAKERS = { label: 'Responsáveis', route: '/responsaveis', icon: 'users', group: 'Administração' };
const OWN_PASSWORD = { label: 'Trocar senha', route: '/minha-conta/senha', icon: 'lock', group: 'Minha conta' };

/** O menu de quem está na sessão (FR-011), com o ícone e o grupo de cada item. */
describe('menuFor', () => {
  it('offers a common user the home, the sectors and the own password, and nothing administrative', () => {
    expect(menuFor('USER')).toEqual([HOME, SECTORS, OWN_PASSWORD]);
  });

  it('adds the caretaker administration for an administrator, under its own group', () => {
    expect(menuFor('ADMINISTRATOR')).toEqual([HOME, SECTORS, CARETAKERS, OWN_PASSWORD]);
  });

  it('offers the sectors to every profile, under the production group (002, US4)', () => {
    expect(menuFor('USER')).toContainEqual(SECTORS);
    expect(menuFor('ADMINISTRATOR')).toContainEqual(SECTORS);
  });

  it('offers the own password change to every profile (US4)', () => {
    expect(menuFor('USER')).toContainEqual(OWN_PASSWORD);
    expect(menuFor('ADMINISTRATOR')).toContainEqual(OWN_PASSWORD);
  });

  it('does not hand the layout the rule of who sees each item', () => {
    // O layout não conhece perfil (T233): o item chega sem o perfil mínimo para vê-lo.
    expect(menuFor('ADMINISTRATOR').every((item) => !('administratorOnly' in item))).toBe(true);
  });
});
