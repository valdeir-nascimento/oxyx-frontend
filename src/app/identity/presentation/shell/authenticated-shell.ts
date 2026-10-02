import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { THEME_DISPLAY } from '../../../shared/application/theme-display';
import { ThemePreference } from '../../../shared/domain/theme-preference';
import { AuthenticatedLayout } from '../../../shared/presentation/layout/authenticated-layout';
import { ThemePicker } from '../../../shared/presentation/ui/theme-picker/theme-picker';
import { Toaster } from '../../../shared/presentation/ui/toast/toaster';
import { ChooseThemeUseCase } from '../../application/account/choose-theme.usecase';
import { SessionStore } from '../../application/authentication/session-store';
import { SignOutUseCase } from '../../application/authentication/sign-out.usecase';
import { roleLabelOf } from '../labels/labels';
import { menuFor } from './menu';

/**
 * Casca da aplicação autenticada.
 *
 * É o que liga a sessão ao layout compartilhado: decide o menu e o rótulo do perfil de quem está na
 * sessão e os entrega por entrada, e o layout não conhece perfil (princípio I, T233). Sair é o caso
 * de uso que executa; a casca só navega depois que o backend confirma que a sessão acabou (FR-004).
 * Se a saída falhar, um toast de perigo diz por quê, e a pessoa continua na tela em que estava.
 */
@Component({
  selector: 'ovyx-authenticated-shell',
  imports: [AuthenticatedLayout, ThemePicker],
  templateUrl: './authenticated-shell.html',
  styleUrl: './authenticated-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthenticatedShell {
  private readonly signOutUseCase = inject(SignOutUseCase);
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);
  private readonly chooseThemeUseCase = inject(ChooseThemeUseCase);

  protected readonly caretaker = inject(SessionStore).caretaker;

  /**
   * O tema em vigor, que o seletor do topo mostra (FR-004 da 011). Vem da tela, não da sessão: o tema da conta
   * guardado na entrada fica velho com a escolha feita depois, nesta casca, numa casca anterior ou em outra aba.
   */
  protected readonly theme = inject(THEME_DISPLAY).current;

  /** O que o perfil de quem está na sessão pode ver (FR-011). */
  protected readonly menuItems = computed(() => {
    const caretaker = this.caretaker();
    return caretaker ? menuFor(caretaker.role) : [];
  });

  protected readonly roleLabel = computed(() => {
    const caretaker = this.caretaker();
    return caretaker ? roleLabelOf(caretaker.role) : '';
  });

  /**
   * O tema escolhido no seletor do topo: vale na hora e é guardado na conta (US1 e US2 da 011). Se não der para
   * guardar, a tela fica no tema escolhido, e um aviso diz que ele vale só neste aparelho (FR-008).
   */
  protected async chooseTheme(preference: ThemePreference): Promise<void> {
    const result = await this.chooseThemeUseCase.execute(preference);
    if (!result.success) {
      this.toaster.show('Tema aplicado só neste aparelho; não foi possível guardar na sua conta.', 'danger');
    }
  }

  protected async signOut(): Promise<void> {
    const result = await this.signOutUseCase.execute();

    if (!result.success) {
      // A sessão continua valendo no cookie: levar à tela de acesso faria parecer encerrado o que
      // não foi.
      result.notification.errors.forEach((error) => this.toaster.show(error.message, 'danger'));
      return;
    }

    await this.router.navigate(['/acesso']);
  }
}
