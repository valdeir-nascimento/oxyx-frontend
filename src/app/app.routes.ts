import { Routes } from '@angular/router';
import {
  administratorGuard,
  anonymousGuard,
  authenticatedGuard,
  passwordChangeGuard,
} from './identity/infrastructure/session.guard';

/**
 * Rotas da aplicação.
 *
 * Os caminhos são em português, como o restante da interface (princípio VII). Os guards não são a
 * proteção — quem protege é o backend, que responde 401 e 403 de qualquer forma; eles evitam
 * oferecer uma tela que terminaria em erro.
 */
export const routes: Routes = [
  {
    path: 'acesso',
    canActivate: [anonymousGuard],
    loadComponent: () =>
      import('./identity/presentation/authentication/sign-in-page').then((m) => m.SignInPage),
    title: 'Entrar — Ovyx',
  },
  {
    path: 'trocar-senha',
    canActivate: [passwordChangeGuard],
    loadComponent: () =>
      import('./identity/presentation/account/change-password-page').then(
        (m) => m.ChangePasswordPage,
      ),
    title: 'Trocar senha — Ovyx',
  },
  {
    path: 'acesso-negado',
    loadComponent: () =>
      import('./shared/presentation/access-denied/access-denied').then((m) => m.AccessDenied),
    title: 'Acesso negado — Ovyx',
  },
  {
    path: '',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./identity/presentation/shell/authenticated-shell').then((m) => m.AuthenticatedShell),
    children: [
      {
        path: '',
        loadComponent: () => import('./shared/presentation/home/home').then((m) => m.Home),
        title: 'Ovyx',
      },
      {
        // Área administrativa (FR-008): o guard só evita desenhar uma tela de recusas; quem
        // protege é o backend, que responde 403 a quem não é administrador.
        path: 'responsaveis',
        canActivate: [administratorGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./identity/presentation/caretaker/caretaker-list/caretaker-list-page').then(
                (m) => m.CaretakerListPage,
              ),
            title: 'Responsáveis — Ovyx',
          },
          {
            path: 'novo',
            loadComponent: () =>
              import('./identity/presentation/caretaker/caretaker-form/caretaker-form-page').then(
                (m) => m.CaretakerFormPage,
              ),
            title: 'Novo responsável — Ovyx',
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./identity/presentation/caretaker/caretaker-form/caretaker-form-page').then(
                (m) => m.CaretakerFormPage,
              ),
            title: 'Editar responsável — Ovyx',
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
