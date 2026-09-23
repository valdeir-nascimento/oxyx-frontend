import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticatedLayout } from '../../../shared/presentation/layout/authenticated-layout';
import { Alert } from '../../../shared/presentation/ui/alert/alert';
import { Notification } from '../../../shared/domain/notification';
import { SessionStore } from '../../application/authentication/session-store';
import { SignOutUseCase } from '../../application/authentication/sign-out.usecase';

/**
 * Casca da aplicação autenticada.
 *
 * É o que liga a sessão ao layout compartilhado: o layout recebe nome e perfil por entrada e não
 * conhece o contexto identity (princípio I). Sair é o caso de uso que executa; a casca só navega
 * depois que o backend confirma que a sessão acabou (FR-004).
 */
@Component({
  selector: 'ovyx-authenticated-shell',
  imports: [AuthenticatedLayout, Alert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (caretaker(); as caretaker) {
      @if (notification().hasErrors) {
        <div class="shell__notice">
          <ovyx-alert variant="danger">
            @for (error of notification().errors; track error.message) {
              <p>{{ error.message }}</p>
            }
          </ovyx-alert>
        </div>
      }

      <ovyx-authenticated-layout
        [fullName]="caretaker.fullName"
        [role]="caretaker.role"
        (signOut)="signOut()"
      />
    }
  `,
  styles: `
    .shell__notice {
      padding: var(--ovyx-space-3) var(--ovyx-layout-gutter);
    }
  `,
})
export class AuthenticatedShell {
  private readonly signOutUseCase = inject(SignOutUseCase);
  private readonly router = inject(Router);

  protected readonly caretaker = inject(SessionStore).caretaker;
  protected readonly notification = signal(Notification.empty());

  protected async signOut(): Promise<void> {
    const result = await this.signOutUseCase.execute();

    if (!result.success) {
      // A sessão continua valendo no cookie: levar à tela de acesso faria parecer encerrado o que
      // não foi.
      this.notification.set(result.notification);
      return;
    }

    this.notification.set(Notification.empty());
    await this.router.navigate(['/acesso']);
  }
}
