import { TestBed } from '@angular/core/testing';
import { AuthenticatedCaretaker } from '../../domain/authenticated-caretaker';
import { SessionStore } from './session-store';

/**
 * A loja guarda **quem** está na sessão, não a sessão em si — essa vive no cookie do navegador e é
 * o backend quem a invalida (FR-004). O que existe aqui é o que a casca precisa desenhar e o que o
 * guard precisa decidir.
 */
describe('SessionStore', () => {
  const maria: AuthenticatedCaretaker = {
    id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
    fullName: 'Maria Silva',
    role: 'ADMINISTRATOR',
    mustChangePassword: true,
  };

  function store(): SessionStore {
    TestBed.configureTestingModule({ providers: [SessionStore] });
    return TestBed.inject(SessionStore);
  }

  it('starts empty, because entering is what creates a session', () => {
    const session = store();

    expect(session.caretaker()).toBeNull();
    expect(session.mustChangePassword()).toBe(false);
  });

  it('exposes who entered and the pending provisional password', () => {
    const session = store();

    session.remember(maria);

    expect(session.caretaker()).toEqual(maria);
    expect(session.mustChangePassword()).toBe(true);
  });

  it('forgets everything on the way out, leaving no name on screen', () => {
    const session = store();
    session.remember(maria);

    session.forget();

    expect(session.caretaker()).toBeNull();
  });

  it('drops the obligation without dropping the session, so the change does not force a new sign-in', () => {
    const session = store();
    session.remember(maria);

    session.markPasswordChanged();

    expect(session.mustChangePassword()).toBe(false);
    expect(session.caretaker()?.id).toBe(maria.id);
  });
});
