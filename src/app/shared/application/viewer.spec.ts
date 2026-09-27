import { TestBed } from '@angular/core/testing';
import { VIEWER } from './viewer';

/**
 * Quem está vendo a tela, para ela decidir o que oferecer. Sem ninguém que diga o perfil, a tela não
 * oferece nada que altere: quem protege é o backend, e o padrão seguro é não oferecer o que ele recusaria.
 */
describe('VIEWER', () => {
  it('treats the viewer as not an administrator when nobody tells otherwise', () => {
    const viewer = TestBed.inject(VIEWER);

    expect(viewer.isAdministrator()).toBe(false);
  });
});
