import { HttpErrorResponse } from '@angular/common/http';
import { Result, failure, success } from '../application/result';
import { ProblemDetails, toNotification } from './problem-details';

/**
 * Executa uma chamada HTTP e traduz a recusa do backend em `Result`, preservando as suas mensagens.
 *
 * É o que todo adaptador HTTP do cliente faz com a resposta: quem chama é caso de uso, e caso de uso
 * não trata `catch` (princípio IV, espelhado no cliente).
 */
export async function resultOf<T>(call: () => Promise<T>): Promise<Result<T>> {
  try {
    return success(await call());
  } catch (error) {
    if (!(error instanceof HttpErrorResponse)) {
      // Defeito do cliente — um `TypeError`, por exemplo — não é recusa do backend. Traduzi-lo em
      // "tente novamente" esconderia de quem programa o erro que só ele pode corrigir.
      throw error;
    }
    return failure(toNotification(problemOf(error)));
  }
}

/**
 * Corpo de erro do backend, quando houver; `null` quando não há.
 *
 * Numa falha de rede o `error` é um `ProgressEvent`, que é objeto mas não é Problem Details — e
 * tratá-lo como tal produzia uma violação com mensagem `undefined` na tela. Por isso a checagem é
 * pelo que o corpo carrega, e não pelo tipo.
 */
function problemOf(error: HttpErrorResponse): ProblemDetails | null {
  const body: unknown = error.error;
  const isProblem =
    typeof body === 'object' &&
    body !== null &&
    ('code' in body || 'title' in body || 'detail' in body);

  return isProblem ? (body as ProblemDetails) : null;
}
