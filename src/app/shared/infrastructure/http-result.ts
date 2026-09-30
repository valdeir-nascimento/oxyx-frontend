import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Result, failure, success } from '../application/result';
import { SpreadsheetFile } from '../application/spreadsheet-file';
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
 * Executa uma chamada que baixa arquivo e traduz a resposta em `Result` (R-014 da 007).
 *
 * O nome do arquivo vem do `Content-Disposition`; sem ele, vale o nome de reserva de quem chama. Com
 * `responseType: 'blob'`, a recusa do backend também chega como Blob: ela é lida como texto e passa pela
 * mesma tradução do `resultOf`, para a recusa por campo chegar ao formulário como nas demais telas.
 */
export async function fileResultOf(
  call: () => Promise<HttpResponse<Blob>>,
  fallbackName: string,
): Promise<Result<SpreadsheetFile>> {
  try {
    const response = await call();
    return success({
      name: fileNameOf(response.headers.get('Content-Disposition')) ?? fallbackName,
      content: response.body ?? new Blob(),
    });
  } catch (error) {
    if (!(error instanceof HttpErrorResponse)) {
      throw error;
    }
    const body: unknown = error.error;
    const problem = body instanceof Blob ? await problemIn(body) : problemOf(error);
    return failure(toNotification(problem));
  }
}

/** O nome do `Content-Disposition`, preferindo o `filename*` em UTF-8 quando vierem os dois. */
function fileNameOf(disposition: string | null): string | null {
  if (!disposition) {
    return null;
  }
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition);
  if (encoded) {
    return decodeURIComponent(encoded[1].trim());
  }
  const plain = /filename\s*=\s*"([^"]*)"/i.exec(disposition) ?? /filename\s*=\s*([^;]+)/i.exec(disposition);
  return plain ? plain[1].trim() : null;
}

/** O Problem Details que veio dentro do Blob; `null` quando o corpo não é um. */
async function problemIn(body: Blob): Promise<ProblemDetails | null> {
  try {
    const parsed: unknown = JSON.parse(await body.text());
    return isProblem(parsed) ? parsed : null;
  } catch {
    return null;
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
  return isProblem(body) ? body : null;
}

function isProblem(body: unknown): body is ProblemDetails {
  return typeof body === 'object' && body !== null && ('code' in body || 'title' in body || 'detail' in body);
}
