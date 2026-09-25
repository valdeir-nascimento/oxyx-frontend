import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SKIP_SESSION_HANDLING } from './session.interceptor';
import { IdentityHttpAdapter } from './identity-http.adapter';

/**
 * O adaptador é o único lugar do cliente que conhece HTTP. O que se verifica aqui é justamente o
 * que o mock de um caso de uso esconderia: o método, o caminho, o corpo enviado e a tradução da
 * recusa do backend em `Notification`.
 */
describe('IdentityHttpAdapter', () => {
  let adapter: IdentityHttpAdapter;
  let backend: HttpTestingController;

  const maria = {
    id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
    fullName: 'Maria Silva',
    role: 'USER' as const,
    mustChangePassword: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IdentityHttpAdapter, provideHttpClient(), provideHttpClientTesting()],
    });
    adapter = TestBed.inject(IdentityHttpAdapter);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('posts the credentials to the sign-in endpoint and returns the identity', async () => {
    const pending = adapter.signIn({
      identifier: 'maria.silva@ovyx.com.br',
      password: 'GranjaNorte2026',
    });

    const request = backend.expectOne('/api/v1/auth/sign-in');
    expect(request.request.method).toBe('POST');
    // O 401 daqui é senha errada, não sessão expirada: sem dispensar o tratamento de sessão, o
    // interceptador levaria quem digitou errado para a tela de acesso alegando expiração.
    expect(request.request.context.get(SKIP_SESSION_HANDLING)).toBe(true);
    expect(request.request.body).toEqual({
      identifier: 'maria.silva@ovyx.com.br',
      password: 'GranjaNorte2026',
    });
    request.flush(maria);

    const result = await pending;
    expect(result.success && result.value).toEqual(maria);
  });

  it('turns a refused credential into a failure with the message the backend chose', async () => {
    const pending = adapter.signIn({ identifier: 'maria.silva@ovyx.com.br', password: 'errada' });

    backend.expectOne('/api/v1/auth/sign-in').flush(
      {
        code: 'INVALID_CREDENTIALS',
        title: 'Não autenticado',
        status: 401,
        detail: 'E-mail, celular ou senha inválidos.',
        instance: '/api/v1/auth/sign-in',
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    const result = await pending;
    expect(result.success).toBe(false);
    expect(result.success === false && result.notification.errors[0]).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'E-mail, celular ou senha inválidos.',
    });
  });

  it('spreads every refused field of a validation into its own violation', async () => {
    // FR-017: o backend devolve todos os campos em `details`, e a tela precisa de um por campo
    // para exibir a mensagem junto ao input certo.
    const pending = adapter.signIn({ identifier: '', password: '' });

    backend.expectOne('/api/v1/auth/sign-in').flush(
      {
        code: 'VALIDATION_FAILED',
        title: 'Dados inválidos',
        status: 400,
        detail: 'A requisição contém campos inválidos.',
        instance: '/api/v1/auth/sign-in',
        details: {
          identifier: 'Informe o e-mail ou o celular.',
          password: 'Informe a senha.',
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    const result = await pending;
    expect(result.success === false && result.notification.messageFor('identifier')).toBe(
      'Informe o e-mail ou o celular.',
    );
    expect(result.success === false && result.notification.messageFor('password')).toBe(
      'Informe a senha.',
    );
  });

  it('signs out through the endpoint that invalidates the session on the server', async () => {
    const pending = adapter.signOut();

    const request = backend.expectOne('/api/v1/auth/sign-out');
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect((await pending).success).toBe(true);
  });

  it('asks the backend who is in the session', async () => {
    const pending = adapter.currentCaretaker();

    const request = backend.expectOne('/api/v1/auth/me');
    expect(request.request.method).toBe('GET');
    // Sondagem no carregamento: quem nunca entrou recebe 401 aqui, e isso não é "sessão expirada".
    expect(request.request.context.get(SKIP_SESSION_HANDLING)).toBe(true);
    request.flush(maria);

    const result = await pending;
    expect(result.success && result.value).toEqual(maria);
  });

  it('answers a failure, not an exception, when there is no session', async () => {
    const pending = adapter.currentCaretaker();

    backend.expectOne('/api/v1/auth/me').flush(
      {
        code: 'UNAUTHENTICATED',
        title: 'Não autenticado',
        status: 401,
        detail: 'Sua sessão expirou. Entre novamente para continuar.',
        instance: '/api/v1/auth/me',
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    const result = await pending;
    expect(result.success).toBe(false);
    expect(result.success === false && result.notification.errors[0].code).toBe('UNAUTHENTICATED');
  });

  it('answers a generic failure when the backend is unreachable', async () => {
    // Sem corpo de erro não há mensagem do backend; a tela ainda precisa de algo em português.
    const pending = adapter.signIn({ identifier: 'maria.silva@ovyx.com.br', password: 'Granja1' });

    backend.expectOne('/api/v1/auth/sign-in').error(new ProgressEvent('network error'));

    const result = await pending;
    expect(result.success).toBe(false);
    expect(result.success === false && result.notification.errors[0].message).toContain(
      'Não foi possível',
    );
  });

  it('changes the own password through the endpoint the backend exposes', async () => {
    const pending = adapter.changeOwnPassword({
      currentPassword: 'GranjaNorte2026',
      newPassword: 'PosturaAviario2027',
    });

    const request = backend.expectOne('/api/v1/me/password');
    expect(request.request.method).toBe('PUT');
    // Aqui o 401 é sessão expirada de verdade, e quem trata é o interceptador.
    expect(request.request.context.get(SKIP_SESSION_HANDLING)).toBe(false);
    expect(request.request.body).toEqual({
      currentPassword: 'GranjaNorte2026',
      newPassword: 'PosturaAviario2027',
    });
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect((await pending).success).toBe(true);
  });

  it('spreads a refused password change over the two fields it concerns', async () => {
    const pending = adapter.changeOwnPassword({ currentPassword: 'errada', newPassword: 'abc' });

    backend.expectOne('/api/v1/me/password').flush(
      {
        code: 'VALIDATION_FAILED',
        title: 'Dados inválidos',
        status: 400,
        detail: 'A requisição contém campos inválidos.',
        instance: '/api/v1/me/password',
        details: {
          currentPassword: 'A senha atual está incorreta.',
          newPassword: 'A senha deve ter ao menos 12 caracteres.',
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    const result = await pending;
    expect(result.success === false && result.notification.messageFor('currentPassword')).toBe(
      'A senha atual está incorreta.',
    );
    expect(result.success === false && result.notification.messageFor('newPassword')).toBe(
      'A senha deve ter ao menos 12 caracteres.',
    );
  });

  it('lets a client-side defect through, instead of disguising it as a refusal', async () => {
    // Um TypeError traduzido em "Não foi possível concluir a operação" some do console e vira
    // mensagem de rede para o usuário, escondendo o defeito de quem pode corrigi-lo.
    vi.spyOn(TestBed.inject(HttpClient), 'post').mockImplementation(() => {
      throw new TypeError('defeito de cliente');
    });

    await expect(adapter.signOut()).rejects.toThrow(TypeError);
  });

  describe('caretaker administration', () => {
    const joao = {
      id: '9f8e7d6c-5b4a-4938-2716-0f1e2d3c4b5a',
      fullName: 'João Pereira de Souza',
      cpf: '52998224725',
      email: 'joao.pereira@ovyx.com.br',
      mobilePhone: '91991234567',
      role: 'USER' as const,
      status: 'ACTIVE' as const,
      createdAt: '2026-09-18T13:45:10Z',
      updatedAt: '2026-09-18T13:45:10Z',
    };

    it('searches with only the filters that were asked, plus the page', async () => {
      const pending = adapter.search({ name: 'pereira', page: 1, size: 20 });

      const request = backend.expectOne((req) => req.url === '/api/v1/caretakers');
      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys().sort()).toEqual(['name', 'page', 'size']);
      expect(request.request.params.get('name')).toBe('pereira');
      expect(request.request.params.get('page')).toBe('1');
      request.flush({ content: [joao], page: 1, size: 20, totalElements: 21, totalPages: 2 });

      const result = await pending;
      expect(result.success && result.value.totalElements).toBe(21);
    });

    it('sends no filter at all when none was asked, only the page', async () => {
      // Um `status` vazio seria recusado pelo backend como valor inválido; um `name` vazio seria
      // uma pesquisa por nada.
      const pending = adapter.search({ page: 0, size: 20 });

      const request = backend.expectOne((req) => req.url === '/api/v1/caretakers');
      expect(request.request.params.keys().sort()).toEqual(['page', 'size']);
      request.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
      await pending;
    });

    it('registers through the collection and returns the created caretaker', async () => {
      const registration = {
        fullName: joao.fullName,
        cpf: joao.cpf,
        email: joao.email,
        mobilePhone: joao.mobilePhone,
        password: 'AviarioSul2026',
        role: 'USER' as const,
      };
      const pending = adapter.register(registration);

      const request = backend.expectOne('/api/v1/caretakers');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(registration);
      request.flush(joao, { status: 201, statusText: 'Created' });

      const result = await pending;
      expect(result.success && result.value).toEqual(joao);
    });

    it('turns a conflict into a violation of the field that already has an owner', async () => {
      const pending = adapter.register({ ...joao, password: 'AviarioSul2026' });

      backend.expectOne('/api/v1/caretakers').flush(
        {
          code: 'EMAIL_ALREADY_IN_USE',
          title: 'Operação recusada',
          status: 409,
          detail: 'Já existe um responsável ativo com este e-mail.',
          details: { email: 'Já existe um responsável ativo com este e-mail.' },
        },
        { status: 409, statusText: 'Conflict' },
      );

      const result = await pending;
      expect(result.success === false && result.notification.errors).toEqual([
        {
          code: 'EMAIL_ALREADY_IN_USE',
          field: 'email',
          message: 'Já existe um responsável ativo com este e-mail.',
        },
      ]);
    });

    it('finds, updates and deactivates by the caretaker id, each with its own method', async () => {
      const update = { fullName: joao.fullName, cpf: joao.cpf, email: joao.email, mobilePhone: joao.mobilePhone, role: 'ADMINISTRATOR' as const };

      const found = adapter.find(joao.id);
      const find = backend.expectOne(`/api/v1/caretakers/${joao.id}`);
      expect(find.request.method).toBe('GET');
      find.flush(joao);
      await found;

      const updated = adapter.update(joao.id, update);
      const put = backend.expectOne(`/api/v1/caretakers/${joao.id}`);
      expect(put.request.method).toBe('PUT');
      expect(put.request.body).toEqual(update);
      put.flush({ ...joao, role: 'ADMINISTRATOR' });
      await updated;

      const deactivated = adapter.deactivate(joao.id);
      const deactivation = backend.expectOne(`/api/v1/caretakers/${joao.id}/deactivation`);
      expect(deactivation.request.method).toBe('POST');
      deactivation.flush({ ...joao, status: 'INACTIVE' });

      const result = await deactivated;
      expect(result.success && result.value.status).toBe('INACTIVE');
    });

    it('encodes the caretaker id in the address, so a forged id cannot reach another endpoint', async () => {
      // O navegador resolve os ".." de um caminho: sem codificar, o identificador tirado do endereço
      // da tela levava a edição a chamar /api/v1/me/password.
      const found = adapter.find('../../me/password');

      backend.expectOne('/api/v1/caretakers/..%2F..%2Fme%2Fpassword').flush(joao);
      await found;
    });
  });
});
