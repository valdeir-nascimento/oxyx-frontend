import { Notification } from '../../../shared/domain/notification';

/** O código da recusa do link que não vale mais: usado, vencido, substituído, anulado ou inexistente (feature 012). */
export const RECOVERY_LINK_INVALID = 'RECOVERY_LINK_INVALID';

/** Se a recusa é a do link que não vale, e não a da senha ou uma falha da rede. */
export function isInvalidLink(notification: Notification): boolean {
  return notification.errors.some((error) => error.code === RECOVERY_LINK_INVALID);
}
