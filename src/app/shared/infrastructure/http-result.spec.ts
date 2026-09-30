import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { failure, success } from '../application/result';
import { Notification } from '../domain/notification';
import { fileResultOf, resultOf } from './http-result';

/**
 * O que todo adaptador HTTP do cliente faz com a resposta: a resposta vira sucesso, a recusa do
 * backend vira falha com as mensagens dele, e o defeito do próprio cliente continua exceção.
 */
describe('resultOf', () => {
  function refusal(status: number, error: unknown): () => Promise<never> {
    return () => Promise.reject(new HttpErrorResponse({ status, error }));
  }

  it('turns the answer of the backend into a success', async () => {
    const result = await resultOf(() => Promise.resolve({ id: 'sector-1' }));

    expect(result).toEqual(success({ id: 'sector-1' }));
  });

  it('keeps every field the backend refused, each with its message', async () => {
    const result = await resultOf(
      refusal(400, {
        title: 'Requisição inválida',
        status: 400,
        code: 'VALIDATION_FAILED',
        details: { battery: 'Informe a bateria.', number: 'Informe o número.' },
      }),
    );

    expect(result).toEqual(
      failure(
        Notification.of([
          { code: 'VALIDATION_FAILED', field: 'battery', message: 'Informe a bateria.' },
          { code: 'VALIDATION_FAILED', field: 'number', message: 'Informe o número.' },
        ]),
      ),
    );
  });

  it('keeps the code and the detail of a refusal that is about no field', async () => {
    const result = await resultOf(
      refusal(409, { title: 'Conflito', status: 409, code: 'SECTOR_INACTIVE', detail: 'O setor está inativo.' }),
    );

    expect(result).toEqual(failure(Notification.of([{ code: 'SECTOR_INACTIVE', message: 'O setor está inativo.' }])));
  });

  it('says to try again when the request did not reach the backend', async () => {
    // Na falha de rede o corpo é um ProgressEvent: objeto, mas não Problem Details.
    const result = await resultOf(refusal(0, new ProgressEvent('error')));

    expect(result).toEqual(
      failure(
        Notification.of([{ code: 'REQUEST_FAILED', message: 'Não houve resposta do servidor. Tente novamente em instantes.' }]),
      ),
    );
  });

  it('says to try again when something between the client and the backend answers with no Problem Details', async () => {
    const result = await resultOf(refusal(502, '<html>Bad Gateway</html>'));

    expect(result).toEqual(
      failure(
        Notification.of([{ code: 'REQUEST_FAILED', message: 'Não houve resposta do servidor. Tente novamente em instantes.' }]),
      ),
    );
  });

  it('lets a defect of the client itself go through, for whoever programs to see it', async () => {
    const defect = new TypeError('Cannot read properties of undefined');

    await expect(resultOf(() => Promise.reject(defect))).rejects.toBe(defect);
  });
});

/**
 * A resposta com arquivo (R-014 da 007): o nome vem do `Content-Disposition`, e a recusa, que chega como
 * Blob por causa do `responseType: 'blob'`, é lida como Problem Details, com as mensagens de cada campo.
 */
describe('fileResultOf', () => {
  const content = new Blob(['PK'], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  function answer(disposition?: string): () => Promise<HttpResponse<Blob>> {
    const headers = disposition ? new HttpHeaders({ 'Content-Disposition': disposition }) : new HttpHeaders();
    return () => Promise.resolve(new HttpResponse({ status: 200, body: content, headers }));
  }

  function refusal(status: number, error: unknown): () => Promise<never> {
    return () => Promise.reject(new HttpErrorResponse({ status, error }));
  }

  function problem(body: unknown): Blob {
    return new Blob([JSON.stringify(body)], { type: 'application/problem+json' });
  }

  it('names the file as the backend says', async () => {
    const result = await fileResultOf(answer('attachment; filename="gaiolas-codornas-galpao-1.xlsx"'), 'gaiolas.xlsx');

    expect(result).toEqual(success({ name: 'gaiolas-codornas-galpao-1.xlsx', content }));
  });

  it('prefers the name encoded in UTF-8 when the backend sends both', async () => {
    const result = await fileResultOf(
      answer(`attachment; filename="painel.xlsx"; filename*=UTF-8''painel-galp%C3%A3o-1.xlsx`),
      'painel.xlsx',
    );

    expect(result.success && result.value.name).toBe('painel-galpão-1.xlsx');
  });

  it('falls back to the name the caller gives when the backend says none', async () => {
    const result = await fileResultOf(answer(), 'relatorios.xlsx');

    expect(result.success && result.value.name).toBe('relatorios.xlsx');
  });

  it('reads every field the backend refused from the Blob', async () => {
    const result = await fileResultOf(
      refusal(
        400,
        problem({
          title: 'Dados inválidos',
          status: 400,
          code: 'VALIDATION_FAILED',
          details: { from: 'Informe a data inicial.', to: 'Informe a data final.' },
        }),
      ),
      'relatorios.xlsx',
    );

    expect(result).toEqual(
      failure(
        Notification.of([
          { code: 'VALIDATION_FAILED', field: 'from', message: 'Informe a data inicial.' },
          { code: 'VALIDATION_FAILED', field: 'to', message: 'Informe a data final.' },
        ]),
      ),
    );
  });

  it('reads the detail of a refusal that is about no field from the Blob', async () => {
    const result = await fileResultOf(
      refusal(404, problem({ title: 'Não encontrado', status: 404, code: 'SECTOR_NOT_FOUND', detail: 'Setor não encontrado.' })),
      'gaiolas.xlsx',
    );

    expect(result).toEqual(failure(Notification.of([{ code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado.' }])));
  });

  it('says to try again when the Blob is not Problem Details', async () => {
    const result = await fileResultOf(refusal(502, new Blob(['<html>Bad Gateway</html>'], { type: 'text/html' })), 'gaiolas.xlsx');

    expect(result).toEqual(
      failure(
        Notification.of([{ code: 'REQUEST_FAILED', message: 'Não houve resposta do servidor. Tente novamente em instantes.' }]),
      ),
    );
  });

  it('says to try again when the request did not reach the backend', async () => {
    const result = await fileResultOf(refusal(0, new ProgressEvent('error')), 'gaiolas.xlsx');

    expect(result).toEqual(
      failure(
        Notification.of([{ code: 'REQUEST_FAILED', message: 'Não houve resposta do servidor. Tente novamente em instantes.' }]),
      ),
    );
  });

  it('keeps a defect of the client itself as an exception', async () => {
    const defect = new TypeError('Cannot read properties of undefined');

    await expect(fileResultOf(() => Promise.reject(defect), 'gaiolas.xlsx')).rejects.toBe(defect);
  });
});
