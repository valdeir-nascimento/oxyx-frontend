import { TestBed } from '@angular/core/testing';
import { CaretakerChanges } from './caretaker-changes';

/** Aviso de que o cadastro de responsáveis mudou, do diálogo para a lista. */
describe('CaretakerChanges', () => {
  it('starts with no change', () => {
    expect(TestBed.inject(CaretakerChanges).version()).toBe(0);
  });

  it('moves to a new version on each change', () => {
    const changes = TestBed.inject(CaretakerChanges);

    changes.notify();
    changes.notify();

    expect(changes.version()).toBe(2);
  });
});
