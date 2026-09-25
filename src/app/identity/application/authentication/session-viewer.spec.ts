import { TestBed } from '@angular/core/testing';
import { AuthenticatedCaretaker } from '../../domain/authenticated-caretaker';
import { SessionStore } from './session-store';
import { SessionViewer } from './session-viewer';

/**
 * O perfil de quem está na sessão, para as telas dos outros contextos, que não conhecem o identity
 * (R-008 da feature 002, espelhado no cliente).
 */
describe('SessionViewer', () => {
  const maria: AuthenticatedCaretaker = {
    id: '7c1f0b2e-3d4a-4f5b-8c9d-0e1f2a3b4c5d',
    fullName: 'Maria Silva',
    role: 'USER',
    mustChangePassword: false,
  };

  it('tells an administrator in the session', () => {
    TestBed.inject(SessionStore).remember({ ...maria, role: 'ADMINISTRATOR' });

    expect(TestBed.inject(SessionViewer).isAdministrator()).toBe(true);
  });

  it('tells a common user in the session as not an administrator', () => {
    TestBed.inject(SessionStore).remember(maria);

    expect(TestBed.inject(SessionViewer).isAdministrator()).toBe(false);
  });

  it('stops telling an administrator when the session is forgotten', () => {
    const session = TestBed.inject(SessionStore);
    session.remember({ ...maria, role: 'ADMINISTRATOR' });
    const viewer = TestBed.inject(SessionViewer);

    session.forget();

    expect(viewer.isAdministrator()).toBe(false);
  });
});
