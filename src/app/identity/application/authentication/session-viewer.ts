import { Injectable, computed, inject } from '@angular/core';
import { Viewer } from '../../../shared/application/viewer';
import { isAdministrator } from '../../domain/authenticated-caretaker';
import { SessionStore } from './session-store';

/**
 * O perfil de quem está na sessão, para as telas dos outros contextos (`VIEWER`).
 *
 * Acompanha a loja de sessão: quando a sessão acaba, ou o perfil muda na revalidação, o que as telas
 * oferecem muda junto.
 */
@Injectable({ providedIn: 'root' })
export class SessionViewer implements Viewer {
  private readonly session = inject(SessionStore);

  readonly isAdministrator = computed(() => {
    const caretaker = this.session.caretaker();
    return caretaker !== null && isAdministrator(caretaker.role);
  });
}
