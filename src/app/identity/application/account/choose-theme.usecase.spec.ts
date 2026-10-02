import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Result, failure, success } from '../../../shared/application/result';
import { THEME_DISPLAY, ThemeDisplay } from '../../../shared/application/theme-display';
import { Notification } from '../../../shared/domain/notification';
import { ThemePreference } from '../../../shared/domain/theme-preference';
import { ACCOUNT_GATEWAY, AccountGateway } from './account-gateway';
import { ChooseThemeUseCase } from './choose-theme.usecase';

/**
 * A escolha do tema (US1 e US2 da 011): vale na hora, na tela inteira, fica lembrada no aparelho e é guardada na
 * conta. Quando não dá para guardar, a tela não volta atrás: quem chama avisa a pessoa.
 */
describe('ChooseThemeUseCase', () => {
  let applied: ThemePreference[];
  let gateway: AccountGateway;

  function useCase(saved: Result<void>): ChooseThemeUseCase {
    applied = [];
    const display: ThemeDisplay = {
      apply: (preference) => applied.push(preference),
      current: signal<ThemePreference>('SYSTEM'),
    };
    gateway = { changeOwnPassword: vi.fn(), changeTheme: vi.fn().mockResolvedValue(saved) };
    TestBed.configureTestingModule({
      providers: [
        { provide: THEME_DISPLAY, useValue: display },
        { provide: ACCOUNT_GATEWAY, useValue: gateway },
      ],
    });
    return TestBed.inject(ChooseThemeUseCase);
  }

  it('applies the chosen theme on the page and saves it in the account', async () => {
    const result = await useCase(success(undefined)).execute('DARK');

    expect(applied).toEqual(['DARK']);
    expect(gateway.changeTheme).toHaveBeenCalledWith('DARK');
    expect(result.success).toBe(true);
  });

  it('keeps the theme on the page and fails when the account refuses to save it', async () => {
    const refusal = Notification.of([{ code: 'UNAUTHENTICATED', message: 'Sessão expirada.' }]);

    const result = await useCase(failure(refusal)).execute('LIGHT');

    expect(applied).toEqual(['LIGHT']);
    expect(result.success).toBe(false);
  });
});
