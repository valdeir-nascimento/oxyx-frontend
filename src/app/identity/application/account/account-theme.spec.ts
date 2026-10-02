import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { THEME_DISPLAY } from '../../../shared/application/theme-display';
import { ThemePreference } from '../../../shared/domain/theme-preference';
import { AuthenticatedCaretaker } from '../../domain/authenticated-caretaker';
import { AccountTheme } from './account-theme';

/** O tema da conta aplicado na tela (R-004 da 011): na entrada e na restauração da sessão. */
describe('AccountTheme', () => {
  const maria: AuthenticatedCaretaker = {
    id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
    fullName: 'Maria Silva',
    role: 'USER',
    mustChangePassword: false,
    theme: 'DARK',
  };
  let applied: ThemePreference[];

  function accountTheme(): AccountTheme {
    applied = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: THEME_DISPLAY,
          useValue: {
            apply: (theme: ThemePreference) => applied.push(theme),
            current: signal('SYSTEM'),
          },
        },
      ],
    });
    return TestBed.inject(AccountTheme);
  }

  it('applies the theme of the account', () => {
    accountTheme().follow(maria);

    expect(applied).toEqual(['DARK']);
  });

  it('leaves the theme of the browser while the provisional password is not changed (US3)', () => {
    accountTheme().follow({ ...maria, mustChangePassword: true });

    expect(applied).toEqual([]);
  });
});
