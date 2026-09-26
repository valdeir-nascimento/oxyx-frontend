import { Routes } from '@angular/router';
import { activeSectorGuard, sectorCrumbsResolver, sectorTitleResolver } from './farm/presentation/cage/sector-route';
import {
  activeReportSectorGuard,
  reportCrumbsResolver,
  reportTitleResolver,
  reportsCrumbsResolver,
  reportsTitleResolver,
} from './production/presentation/daily-report/report-route';
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
      import('./identity/presentation/account/change-password/change-password-page').then(
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
        // A troca por vontade própria, pelo menu (US4). A obrigatória, da senha provisória, é a
        // tela cheia de /trocar-senha: o guard da casca leva para lá quem ainda a deve.
        path: 'minha-conta/senha',
        loadComponent: () =>
          import('./identity/presentation/account/own-password/own-password-page').then((m) => m.OwnPasswordPage),
        title: 'Trocar senha — Ovyx',
        data: { crumbs: ['Minha conta', 'Trocar senha'] },
      },
      {
        // As gaiolas de um setor (feature 002, US2), antes de `setores`: com ela primeiro, o
        // `:sectorId` do diálogo de setor tentaria o endereço inteiro. O cadastro e a edição de gaiola
        // abrem em diálogo sobre a lista, pelas rotas filhas, e não abrem sobre um setor inativo.
        path: 'setores/:sectorId/gaiolas',
        loadComponent: () =>
          import('./farm/presentation/cage/cage-list/cage-list-page').then((m) => m.CageListPage),
        // O título da aba e o caminho trazem o nome do setor, como no protótipo (Setores › setor ›
        // Gaiolas). O título é da rota: é o que volta quando um diálogo de gaiola fecha.
        title: sectorTitleResolver,
        resolve: { crumbs: sectorCrumbsResolver },
        children: [
          {
            path: 'nova',
            canActivate: [administratorGuard, activeSectorGuard],
            loadComponent: () =>
              import('./farm/presentation/cage/cage-form/cage-form-dialog').then((m) => m.CageFormDialog),
            title: 'Nova gaiola — Ovyx',
          },
          {
            path: ':cageId',
            canActivate: [administratorGuard, activeSectorGuard],
            loadComponent: () =>
              import('./farm/presentation/cage/cage-form/cage-form-dialog').then((m) => m.CageFormDialog),
            title: 'Editar gaiola — Ovyx',
          },
        ],
      },
      {
        // Os relatórios diários de um setor (feature 003, US1), antes de `setores`, como as gaiolas.
        // Qualquer responsável abre relatório (FR-019): a filha `novo` não tem o guard de
        // administrador. O diálogo abre sobre a lista; num setor inativo, a lista esconde a abertura,
        // e o backend a recusa.
        path: 'setores/:sectorId/relatorios',
        loadComponent: () =>
          import('./production/presentation/daily-report/report-list/report-list-page').then((m) => m.ReportListPage),
        title: reportsTitleResolver,
        resolve: { crumbs: reportsCrumbsResolver },
        children: [
          {
            path: 'novo',
            canActivate: [activeReportSectorGuard],
            loadComponent: () =>
              import('./production/presentation/daily-report/report-dialog/report-dialog').then((m) => m.ReportDialog),
            title: 'Novo relatório — Ovyx',
          },
        ],
      },
      {
        // A página de um relatório, depois da lista: antes dela, o `:reportId` tomaria o `novo`.
        path: 'setores/:sectorId/relatorios/:reportId',
        loadComponent: () =>
          import('./production/presentation/daily-report/report-page/report-page').then((m) => m.ReportPage),
        title: reportTitleResolver,
        resolve: { crumbs: reportCrumbsResolver },
        // As abas dos lançamentos (US2 e US3): o relatório abre na de produção. O lançamento de uma
        // gaiola abre em diálogo sobre a aba, pela filha `:cageId`, e a correção dos dados gerais, pela
        // filha `editar`, que vem antes para o `:cageId` não a tomar (US4). Nenhum diálogo abre sobre um
        // setor inativo.
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'producao' },
          {
            path: 'producao',
            loadComponent: () =>
              import('./production/presentation/daily-report/production-tab/production-tab-page').then(
                (m) => m.ProductionTabPage,
              ),
            children: [
              {
                path: 'editar',
                canActivate: [activeReportSectorGuard],
                loadComponent: () =>
                  import('./production/presentation/daily-report/report-dialog/report-dialog').then(
                    (m) => m.ReportDialog,
                  ),
                title: 'Editar relatório — Ovyx',
                data: { tab: 'producao' },
              },
              {
                path: ':cageId',
                canActivate: [activeReportSectorGuard],
                loadComponent: () =>
                  import('./production/presentation/daily-report/production-dialog/production-dialog').then(
                    (m) => m.ProductionDialog,
                  ),
                title: 'Lançar produção — Ovyx',
              },
            ],
          },
          {
            path: 'mortalidade',
            loadComponent: () =>
              import('./production/presentation/daily-report/mortality-tab/mortality-tab-page').then(
                (m) => m.MortalityTabPage,
              ),
            children: [
              {
                path: 'editar',
                canActivate: [activeReportSectorGuard],
                loadComponent: () =>
                  import('./production/presentation/daily-report/report-dialog/report-dialog').then(
                    (m) => m.ReportDialog,
                  ),
                title: 'Editar relatório — Ovyx',
                data: { tab: 'mortalidade' },
              },
              {
                path: ':cageId',
                canActivate: [activeReportSectorGuard],
                loadComponent: () =>
                  import('./production/presentation/daily-report/mortality-dialog/mortality-dialog').then(
                    (m) => m.MortalityDialog,
                  ),
                title: 'Lançar mortalidade — Ovyx',
              },
            ],
          },
        ],
      },
      {
        // A estrutura da granja (feature 002): todo perfil consulta. O cadastro e a edição abrem em
        // diálogo sobre a lista, pelas rotas filhas, só para o administrador (US4): o guard evita
        // desenhar um formulário que terminaria em recusa; quem protege as escritas é o backend.
        path: 'setores',
        loadComponent: () =>
          import('./farm/presentation/sector/sector-list/sector-list-page').then((m) => m.SectorListPage),
        title: 'Setores — Ovyx',
        data: { crumbs: ['Produção', 'Setores'] },
        children: [
          {
            path: 'novo',
            canActivate: [administratorGuard],
            loadComponent: () =>
              import('./farm/presentation/sector/sector-form/sector-form-dialog').then((m) => m.SectorFormDialog),
            title: 'Novo setor — Ovyx',
          },
          {
            path: ':sectorId',
            canActivate: [administratorGuard],
            loadComponent: () =>
              import('./farm/presentation/sector/sector-form/sector-form-dialog').then((m) => m.SectorFormDialog),
            title: 'Editar setor — Ovyx',
          },
        ],
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
