import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PageHeader } from '../../../../shared/presentation/ui/page-header/page-header';
import { Toaster } from '../../../../shared/presentation/ui/toast/toaster';
import { ChangePasswordForm } from '../change-password-form/change-password-form';

/**
 * Troca da própria senha por vontade própria (FR-020, US4; T109), aberta pelo menu "Minha conta".
 *
 * Fica dentro da casca, com caminho de volta, porque a pessoa está no meio do trabalho. A troca
 * obrigatória da senha provisória é outra coisa: continua na tela cheia de `/trocar-senha`, fora da
 * casca, porque ali não há para onde voltar. As duas usam o mesmo formulário.
 */
@Component({
  selector: 'ovyx-own-password-page',
  imports: [ChangePasswordForm, PageHeader],
  templateUrl: './own-password-page.html',
  styleUrl: './own-password-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnPasswordPage {
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);

  protected async done(): Promise<void> {
    this.toaster.show('Senha trocada.');
    await this.goHome();
  }

  protected async goHome(): Promise<void> {
    await this.router.navigate(['/']);
  }
}
