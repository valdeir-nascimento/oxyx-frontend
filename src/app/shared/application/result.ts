import { Notification } from '../domain/notification';

/**
 * Retorno explícito de sucesso ou falha no cliente (princípio IV).
 *
 * Espelha o `Result` do backend. É união discriminada, então o TypeScript obriga a checar
 * `success` antes de ler `value` — o mesmo ganho que a interface selada dá no backend.
 */
export type Result<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly notification: Notification };

export function success<T>(value: T): Result<T> {
  return { success: true, value };
}

export function failure<T>(notification: Notification): Result<T> {
  return { success: false, notification };
}
