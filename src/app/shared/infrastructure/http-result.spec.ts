import { HttpErrorResponse } from '@angular/common/http';
import { failure, success } from '../application/result';
import { Notification } from '../domain/notification';
import { resultOf } from './http-result';

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
