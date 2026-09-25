import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Cage, CagePage } from '../domain/cage';
import { Sector, SectorSummary } from '../domain/sector';
import { FarmHttpAdapter } from './farm-http.adapter';

/**
 * O adaptador é o único lugar do contexto farm que conhece HTTP: o método, o caminho, os parâmetros,
 * o corpo enviado e a tradução da recusa do backend em `Notification` (contracts/farm-api.yaml).
 */
describe('FarmHttpAdapter', () => {
  let adapter: FarmHttpAdapter;
  let backend: HttpTestingController;

  const galpao: Sector = {
    id: '3f6c2b1a-8d4e-4c7f-9a2b-1e5d7c9f0a11',
    name: 'Codornas — Galpão 1',
    description: 'Codornas japonesas em postura, baterias A a D',
    status: 'ACTIVE',
    activeCageCount: 48,
    birdCount: 2400,
    batteries: ['A', 'B', 'C', 'D'],
    createdAt: '2026-09-20T10:15:00Z',
    updatedAt: '2026-09-24T17:40:12Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FarmHttpAdapter, provideHttpClient(), provideHttpClientTesting()],
    });
    adapter = TestBed.inject(FarmHttpAdapter);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('sectors', () => {
    it('lists the sectors of the asked status', async () => {
      const summary: SectorSummary = {
        id: galpao.id,
        name: galpao.name,
        status: 'ACTIVE',
        activeCageCount: 48,
        birdCount: 2400,
      };
      const pending = adapter.listSectors('INACTIVE');

      const request = backend.expectOne((candidate) => candidate.url === '/api/v1/sectors');
      expect(request.request.method).toBe('GET');
      expect(request.request.params.get('status')).toBe('INACTIVE');
      request.flush([summary]);

      const result = await pending;
      expect(result.success && result.value).toEqual([summary]);
    });

    it('finds a sector by its identifier, encoded in the path', async () => {
      // O identificador vem do endereço da tela: sem codificar, um "../" chamaria outro endpoint.
      const pending = adapter.findSector('../me');

      const request = backend.expectOne('/api/v1/sectors/..%2Fme');
      expect(request.request.method).toBe('GET');
      request.flush(galpao);

      const result = await pending;
      expect(result.success && result.value).toEqual(galpao);
    });

    it('posts a new sector with the name and the description as typed', async () => {
      const pending = adapter.registerSector({ name: ' Codornas — Galpão 4 ', description: '' });

      const request = backend.expectOne('/api/v1/sectors');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ name: ' Codornas — Galpão 4 ', description: '' });
      request.flush(galpao, { status: 201, statusText: 'Created' });

      const result = await pending;
      expect(result.success && result.value).toEqual(galpao);
    });

    it('puts the new name and description of a sector', async () => {
      const pending = adapter.updateSector(galpao.id, {
        name: 'Codornas — Galpão 1 (norte)',
        description: 'Baterias A a D',
      });

      const request = backend.expectOne(`/api/v1/sectors/${galpao.id}`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ name: 'Codornas — Galpão 1 (norte)', description: 'Baterias A a D' });
      request.flush({ ...galpao, name: 'Codornas — Galpão 1 (norte)' });

      const result = await pending;
      expect(result.success && result.value.name).toBe('Codornas — Galpão 1 (norte)');
    });

    it('spreads every refused field of a registration into its own violation', async () => {
      const pending = adapter.registerSector({ name: 'A', description: 'd'.repeat(501) });

      backend.expectOne('/api/v1/sectors').flush(
        {
          code: 'VALIDATION_FAILED',
          title: 'Dados inválidos',
          status: 400,
          detail: 'Dados inválidos.',
          instance: '/api/v1/sectors',
          details: {
            name: 'O nome do setor deve ter ao menos 2 caracteres.',
            description: 'A descrição deve ter no máximo 500 caracteres.',
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );

      const result = await pending;
      expect(result.success === false && result.notification.messageFor('name')).toBe(
        'O nome do setor deve ter ao menos 2 caracteres.',
      );
      expect(result.success === false && result.notification.messageFor('description')).toBe(
        'A descrição deve ter no máximo 500 caracteres.',
      );
    });
  });

  describe('cages', () => {
    const sectorId = galpao.id;
    const b07: Cage = {
      id: '9d2e4f6a-1b3c-4d5e-8f7a-2b4c6d8e0f44',
      sectorId,
      code: 'B-07',
      battery: 'B',
      number: 7,
      birdCount: 50,
      status: 'ACTIVE',
      createdAt: '2026-09-21T08:30:00Z',
      updatedAt: '2026-09-24T17:42:05Z',
    };
    const page: CagePage = { content: [b07], page: 0, size: 20, totalElements: 1, totalPages: 1 };

    it('searches the cages of a sector with only the filters asked', async () => {
      const pending = adapter.searchCages(sectorId, { code: 'B-07', status: 'ACTIVE', page: 1, size: 20 });

      const request = backend.expectOne((candidate) => candidate.url === `/api/v1/sectors/${sectorId}/cages`);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.get('code')).toBe('B-07');
      expect(request.request.params.has('battery')).toBe(false);
      expect(request.request.params.get('status')).toBe('ACTIVE');
      expect(request.request.params.get('page')).toBe('1');
      expect(request.request.params.get('size')).toBe('20');
      request.flush(page);

      const result = await pending;
      expect(result.success && result.value).toEqual(page);
    });

    it('sends the number and the birds as numbers when they are integers', async () => {
      const pending = adapter.registerCage(sectorId, { battery: 'b', number: ' 07 ', birdCount: '50' });

      const request = backend.expectOne(`/api/v1/sectors/${sectorId}/cages`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ battery: 'b', number: 7, birdCount: 50 });
      request.flush(b07, { status: 201, statusText: 'Created' });

      const result = await pending;
      expect(result.success && result.value).toEqual(b07);
    });

    it('sends what is not an integer as typed, for the backend to refuse next to the field', async () => {
      // FR-017: convertido aqui, o "12,5" viraria outra coisa, ou sumiria, e a pessoa não saberia
      // por que a gaiola foi recusada.
      const pending = adapter.registerCage(sectorId, { battery: '', number: '', birdCount: '12,5' });

      const request = backend.expectOne(`/api/v1/sectors/${sectorId}/cages`);
      expect(request.request.body).toEqual({ battery: '', number: null, birdCount: '12,5' });
      request.flush(
        {
          code: 'VALIDATION_FAILED',
          title: 'Dados inválidos',
          status: 400,
          detail: 'Dados inválidos.',
          details: {
            battery: 'Informe a bateria, com até 3 letras ou dígitos.',
            number: 'Informe o número da gaiola.',
            birdCount: 'A quantidade de aves deve ser um número inteiro.',
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );

      const result = await pending;
      expect(result.success === false && result.notification.messageFor('birdCount')).toBe(
        'A quantidade de aves deve ser um número inteiro.',
      );
    });

    it('reads the thousands dot as a whole number, and keeps a decimal as typed', async () => {
      // A dica e a mensagem escrevem "1.000", e quem digita assim não pode receber "deve ser um número
      // inteiro". "12.5" continua texto, para o backend recusar como não inteiro.
      const pending = adapter.registerCage(sectorId, { battery: 'B', number: '12.5', birdCount: '1.000' });

      const request = backend.expectOne(`/api/v1/sectors/${sectorId}/cages`);
      expect(request.request.body).toEqual({ battery: 'B', number: '12.5', birdCount: 1000 });
      request.flush(b07, { status: 201, statusText: 'Created' });
      await pending;
    });

    it('finds and updates a cage by the encoded identifiers of the sector and of the cage', async () => {
      const found = adapter.findCage(sectorId, '../x');
      backend.expectOne(`/api/v1/sectors/${sectorId}/cages/..%2Fx`).flush(b07);
      expect((await found).success).toBe(true);

      const updated = adapter.updateCage(sectorId, b07.id, { battery: 'B', number: '7', birdCount: '48' });
      const request = backend.expectOne(`/api/v1/sectors/${sectorId}/cages/${b07.id}`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ battery: 'B', number: 7, birdCount: 48 });
      request.flush({ ...b07, birdCount: 48 });
      expect((await updated).success).toBe(true);
    });
  });

  describe('deactivation and reactivation', () => {
    it.each([
      ['deactivateSector', '/deactivation'],
      ['reactivateSector', '/reactivation'],
    ] as const)('posts the %s of a sector, without a body', async (method, suffix) => {
      const pending = adapter[method](galpao.id);

      const request = backend.expectOne(`/api/v1/sectors/${galpao.id}${suffix}`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toBeNull();
      request.flush(galpao);

      expect((await pending).success).toBe(true);
    });

    it.each([
      ['deactivateCage', '/deactivation'],
      ['reactivateCage', '/reactivation'],
    ] as const)('posts the %s of a cage, without a body', async (method, suffix) => {
      const pending = adapter[method](galpao.id, 'cage-1');

      const request = backend.expectOne(`/api/v1/sectors/${galpao.id}/cages/cage-1${suffix}`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toBeNull();
      request.flush({});

      expect((await pending).success).toBe(true);
    });

    it('turns the refusal of a reactivation into the message the backend chose', async () => {
      const pending = adapter.reactivateSector(galpao.id);

      backend.expectOne(`/api/v1/sectors/${galpao.id}/reactivation`).flush(
        {
          code: 'SECTOR_NAME_IN_USE',
          title: 'Operação recusada',
          status: 409,
          detail: 'Já existe um setor ativo com este nome.',
          details: { name: 'Já existe um setor ativo com este nome.' },
        },
        { status: 409, statusText: 'Conflict' },
      );

      const result = await pending;
      expect(result.success === false && result.notification.errors[0].message).toBe(
        'Já existe um setor ativo com este nome.',
      );
    });
  });
});
