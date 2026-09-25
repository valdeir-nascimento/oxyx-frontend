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
 * oferecer uma tela que terminaria em erro. O `data.crumbs` de cada área é o caminho que a barra
 * superior mostra.
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
    // Tela interna: quem nunca entrou vai para o acesso, e quem deve a senha provisória, para a
    // troca (US3, T240).
    path: 'acesso-negado',
    canActivate: [authenticatedGuard],
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
        data: { crumbs: ['Início'] },
      },
      {
        // Área administrativa (FR-008): o guard só evita desenhar uma tela de recusas; quem
        // protege é o backend, que responde 403 a quem não é administrador. O cadastro e a edição
        // abrem em diálogo sobre a lista: são rotas filhas dela, e a lista continua por trás.
        path: 'responsaveis',
        canActivate: [administratorGuard],
        loadComponent: () =>
          import('./identity/presentation/caretaker/caretaker-list/caretaker-list-page').then(
            (m) => m.CaretakerListPage,
          ),
        title: 'Responsáveis — Ovyx',
        data: { crumbs: ['Administração', 'Responsáveis'] },
        children: [
          {
            path: 'novo',
            loadComponent: () =>
              import('./identity/presentation/caretaker/caretaker-form/caretaker-form-dialog').then(
                (m) => m.CaretakerFormDialog,
              ),
            title: 'Novo responsável — Ovyx',
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./identity/presentation/caretaker/caretaker-form/caretaker-form-dialog').then(
                (m) => m.CaretakerFormDialog,
              ),
            title: 'Editar responsável — Ovyx',
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
