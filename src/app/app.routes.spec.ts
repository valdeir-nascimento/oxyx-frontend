import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Result, failure, success } from './shared/application/result';
import { Notification } from './shared/domain/notification';
import { ACCOUNT_GATEWAY } from './identity/application/account/account-gateway';
import { AUTHENTICATION_GATEWAY } from './identity/application/authentication/authentication-gateway';
import { CARETAKER_GATEWAY } from './identity/application/caretaker/caretaker-gateway';
import { CAGE_GATEWAY } from './farm/application/cage/cage-gateway';
import { SECTOR_GATEWAY } from './farm/application/sector/sector-gateway';
import { Sector } from './farm/domain/sector';
import { SessionStore } from './identity/application/authentication/session-store';
import { sessionInterceptor } from './identity/infrastructure/session.interceptor';
import { AuthenticatedCaretaker } from './identity/domain/authenticated-caretaker';
import { routes } from './app.routes';

/**
 * Os guards são testados em isolamento; este arquivo verifica o que aquilo não alcança: que eles
 * estão presos às rotas certas, e que a aplicação inteira — interceptador, guard e loja de sessão —
 * concorda sobre quem pode ver o quê.
 */
describe('routes', () => {
  const maria: AuthenticatedCaretaker = {
    id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
    fullName: 'Maria Silva',
    role: 'USER',
    mustChangePassword: false,
  };

  function noSession(): Result<AuthenticatedCaretaker> {
    return failure(
      Notification.of([
        { code: 'UNAUTHENTICATED', message: 'Sua sessão expirou. Entre novamente para continuar.' },
      ]),
    );
  }

  const codornas: Sector = {
    id: '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11',
    name: 'Codornas — Galpão 1',
    status: 'ACTIVE',
    activeCageCount: 0,
    birdCount: 0,
    batteries: [],
    createdAt: '2026-09-21T08:30:00Z',
    updatedAt: '2026-09-21T08:30:00Z',
  };

  function configure(sessionOnServer: Result<AuthenticatedCaretaker>, sector?: Sector): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([sessionInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AUTHENTICATION_GATEWAY,
          useValue: {
            signIn: vi.fn(),
            signOut: vi.fn(),
            currentCaretaker: vi.fn().mockResolvedValue(sessionOnServer),
          },
        },
        { provide: ACCOUNT_GATEWAY, useValue: { changeOwnPassword: vi.fn() } },
        {
          provide: CARETAKER_GATEWAY,
          useValue: {
            search: vi
              .fn()
              .mockResolvedValue(success({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })),
            find: vi.fn(),
            register: vi.fn(),
            update: vi.fn(),
            deactivate: vi.fn(),
          },
        },
        {
          provide: SECTOR_GATEWAY,
          useValue: {
            listSectors: vi.fn().mockResolvedValue(success([])),
            findSector: vi
              .fn()
              .mockResolvedValue(
                sector
                  ? success(sector)
                  : failure(Notification.of([{ code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado.' }])),
              ),
            registerSector: vi.fn(),
            updateSector: vi.fn(),
          },
        },
        {
          provide: CAGE_GATEWAY,
          useValue: {
            searchCages: vi
              .fn()
              .mockResolvedValue(success({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })),
            findCage: vi.fn().mockResolvedValue(
              failure(Notification.of([{ code: 'CAGE_NOT_FOUND', message: 'Gaiola não encontrada.' }])),
            ),
            registerCage: vi.fn(),
            updateCage: vi.fn(),
          },
        },
      ],
    });
  }

  /** Espera a navegação que o interceptador dispara sem que ninguém a aguarde. */
  function settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  async function goTo(path: string): Promise<string> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(path);
    return TestBed.inject(Router).url;
  }

  it('sends an anonymous visitor from the authenticated area to the access screen', async () => {
    configure(noSession());

    expect(await goTo('/')).toBe('/acesso');
  });

  it('opens the authenticated area to whoever the backend still recognizes', async () => {
    configure(success(maria));

    expect(await goTo('/')).toBe('/');
  });

  it('holds whoever owes the provisional password on the change screen', async () => {
    configure(success({ ...maria, mustChangePassword: true }));

    expect(await goTo('/')).toBe('/trocar-senha');
  });

  it('keeps a common user out of the caretaker administration (FR-011)', async () => {
    configure(success(maria));

    expect(await goTo('/responsaveis')).toBe('/acesso-negado');
  });

  it('opens the caretaker list to an administrator', async () => {
    configure(success({ ...maria, role: 'ADMINISTRATOR' }));

    expect(await goTo('/responsaveis')).toBe('/responsaveis');
  });

  it('opens the registration form to an administrator', async () => {
    configure(success({ ...maria, role: 'ADMINISTRATOR' }));

    expect(await goTo('/responsaveis/novo')).toBe('/responsaveis/novo');
  });

  it('keeps an anonymous visitor out of the access denied screen, which is an internal one', async () => {
    // Não vazava nada — o texto é genérico —, mas era tela interna servida a quem nunca entrou
    // (US3, T240).
    configure(noSession());

    expect(await goTo('/acesso-negado')).toBe('/acesso');
  });

  it('shows the access denied screen to whoever the backend recognizes', async () => {
    configure(success(maria));

    expect(await goTo('/acesso-negado')).toBe('/acesso-negado');
  });

  it('takes whoever owes the provisional password from access denied to the change screen', async () => {
    // O usuário comum que deve a troca recebe 403 FORBIDDEN numa rota administrativa — a
    // autorização roda antes da exigência da troca —, e o interceptador o leva ao acesso negado.
    // Só este guard o devolve à troca de senha (FR-025).
    configure(success({ ...maria, mustChangePassword: true }));

    expect(await goTo('/acesso-negado')).toBe('/trocar-senha');
  });

  it('opens the own password change inside the shell to whoever the backend recognizes (US4)', async () => {
    configure(success(maria));

    expect(await goTo('/minha-conta/senha')).toBe('/minha-conta/senha');
  });

  it('keeps an anonymous visitor out of the own password change', async () => {
    configure(noSession());

    expect(await goTo('/minha-conta/senha')).toBe('/acesso');
  });

  it('takes whoever owes the provisional password to the full screen change, outside the shell', async () => {
    configure(success({ ...maria, mustChangePassword: true }));

    expect(await goTo('/minha-conta/senha')).toBe('/trocar-senha');
  });

  it('sends whoever does not owe the provisional password from the full screen change to the account page', async () => {
    configure(success(maria));

    expect(await goTo('/trocar-senha')).toBe('/minha-conta/senha');
  });

  it('keeps an anonymous visitor out of the password change screen', async () => {
    configure(noSession());

    expect(await goTo('/trocar-senha')).toBe('/acesso');
  });

  it.each(['/responsaveis/novo', '/responsaveis/9f8e7d6c-5b4a-4938-2716-0f1e2d3c4b5a'])(
    'keeps a common user out of %s by direct address (SC-003)',
    async (path) => {
      configure(success(maria));

      expect(await goTo(path)).toBe('/acesso-negado');
    },
  );

  it('opens the sectors to a common user (002, US1 and US4)', async () => {
    configure(success(maria));

    expect(await goTo('/setores')).toBe('/setores');
  });

  it.each(['/setores/novo', '/setores/3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11'])(
    'opens the sector dialog %s over the list to an administrator',
    async (path) => {
      configure(success({ ...maria, role: 'ADMINISTRATOR' }));

      expect(await goTo(path)).toBe(path);
    },
  );

  it('opens the cages of a sector to a common user (002, US2 and US4)', async () => {
    configure(success(maria));

    expect(await goTo('/setores/3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11/gaiolas')).toBe(
      '/setores/3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11/gaiolas',
    );
  });

  it.each([
    '/setores/3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11/gaiolas/nova',
    '/setores/3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11/gaiolas/9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44',
  ])('opens the cage dialog %s over the cages to an administrator', async (path) => {
    configure(success({ ...maria, role: 'ADMINISTRATOR' }));

    expect(await goTo(path)).toBe(path);
  });

  it.each([
    '/setores/novo',
    '/setores/3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11',
    '/setores/3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11/gaiolas/nova',
    '/setores/3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11/gaiolas/9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44',
  ])('keeps a common user out of the dialog %s by direct address (002, US4, S-10)', async (path) => {
    configure(success(maria));

    expect(await goTo(path)).toBe('/acesso-negado');
  });

  it('names the tab after the sector again when the cage dialog closes (002, QA N-3)', async () => {
    configure(success({ ...maria, role: 'ADMINISTRATOR' }), codornas);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/setores/${codornas.id}/gaiolas/nova`);

    await harness.navigateByUrl(`/setores/${codornas.id}/gaiolas`);

    expect(TestBed.inject(Title).getTitle()).toBe('Gaiolas de Codornas — Galpão 1 — Ovyx');
  });

  it.each(['nova', '9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44'])(
    'sends the cage dialog %s of an inactive sector back to its cages, where the list says why',
    async (dialog) => {
      configure(success({ ...maria, role: 'ADMINISTRATOR' }), { ...codornas, status: 'INACTIVE' });

      expect(await goTo(`/setores/${codornas.id}/gaiolas/${dialog}`)).toBe(`/setores/${codornas.id}/gaiolas`);
    },
  );

  it('keeps an anonymous visitor out of the sectors', async () => {
    configure(noSession());

    expect(await goTo('/setores')).toBe('/acesso');
  });

  it('keeps an authenticated visitor out of the access screen', async () => {
    configure(success(maria));

    expect(await goTo('/acesso')).toBe('/');
  });

  it('leaves the access screen open to whoever has no session', async () => {
    configure(noSession());

    expect(await goTo('/acesso')).toBe('/acesso');
  });

  it('does not bounce an expired session back into the authenticated area', async () => {
    // A identidade em memória sobrevivia ao 401, e o guard devolvia a pessoa à casca com o cookie
    // já recusado — o aviso do FR-003 nunca chegava à tela.
    configure(noSession());
    const store = TestBed.inject(SessionStore);
    store.remember(maria);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(TestBed.inject(Router).url).toBe('/');

    const backend = TestBed.inject(HttpTestingController);
    TestBed.inject(HttpClient)
      .post('/api/v1/auth/sign-out', null)
      .subscribe({ error: () => undefined });
    backend
      .expectOne('/api/v1/auth/sign-out')
      .flush(
        { code: 'UNAUTHENTICATED', title: 'Não autenticado', status: 401 },
        { status: 401, statusText: 'Unauthorized' },
      );
    await settle();

    expect(TestBed.inject(Router).url).toBe('/acesso?sessao=expirada');
    expect(store.caretaker()).toBeNull();
    backend.verify();
  });
});
