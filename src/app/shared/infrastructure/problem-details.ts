import { DomainError } from '../domain/domain-error';
import { Notification } from '../domain/notification';

/**
 * Corpo de erro como o backend devolve em `application/problem+json`.
 *
 * O `code` é o identificador estável da regra violada, em SCREAMING_SNAKE_CASE; `details` traz uma
 * mensagem por campo quando a recusa é de validação.
 */
export interface ProblemDetails {
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly code?: string;
  /** Todas as violações da operação, uma por campo, nunca apenas a primeira. */
  readonly details?: Readonly<Record<string, string>>;
}

const GENERIC_FAILURE_CODE = 'REQUEST_FAILED';

/**
 * Converte a resposta de erro do backend em uma `Notification`.
 *
 * Quando o problema não traz `details` — caso das falhas de autenticação, que por FR-002 não
 * detalham a causa — produz uma violação única a partir do `detail`, para que a tela sempre tenha
 * uma mensagem em português a exibir.
 */
export function toNotification(problem: ProblemDetails | null | undefined): Notification {
  if (!problem) {
    return Notification.of([
      {
        code: GENERIC_FAILURE_CODE,
        message: 'Não foi possível concluir a operação. Tente novamente.',
      },
    ]);
  }

  const violations = fieldViolations(problem);
  if (violations.length > 0) {
    return Notification.of(violations);
  }

  return Notification.of([
    {
      code: problem.code ?? GENERIC_FAILURE_CODE,
      message: problem.detail ?? problem.title,
    },
  ]);
}

/**
 * Chave com que o backend identifica um parâmetro do endereço em formato inválido. O valor é o nome
 * do parâmetro, e não uma mensagem: a mensagem, em português, vem em `detail`.
 */
const PARAMETER_KEY = 'parameter';

/** Uma violação por campo recusado, na ordem em que o backend as devolveu. */
function fieldViolations(problem: ProblemDetails): DomainError[] {
  if (!problem.details || PARAMETER_KEY in problem.details) {
    return [];
  }

  return Object.entries(problem.details).map(([field, message]) => ({
    code: problem.code ?? GENERIC_FAILURE_CODE,
    field,
    message,
  }));
}
