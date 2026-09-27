import { TestBed } from '@angular/core/testing';
import { Toaster } from './toaster';

/** Toasts: confirmam uma ação e somem sozinhos. */
describe('Toaster', () => {
  let toaster: Toaster;

  beforeEach(() => {
    vi.useFakeTimers();
    toaster = TestBed.inject(Toaster);
  });

  afterEach(() => vi.useRealTimers());

  it('shows a success toast by default', () => {
    toaster.show('Responsável cadastrado: Maria Silva.');

    expect(toaster.toasts()).toEqual([
      expect.objectContaining({ message: 'Responsável cadastrado: Maria Silva.', tone: 'success' }),
    ]);
  });

  it('stacks the toasts in the order they came', () => {
    toaster.show('Primeiro.');
    toaster.show('Segundo.', 'danger');

    expect(toaster.toasts().map((toast) => toast.message)).toEqual(['Primeiro.', 'Segundo.']);
  });

  it('removes each toast by itself once its time is up', () => {
    toaster.show('Primeiro.', 'success', 1000);
    toaster.show('Segundo.', 'success', 3000);

    vi.advanceTimersByTime(1000);

    expect(toaster.toasts().map((toast) => toast.message)).toEqual(['Segundo.']);
  });

  it('stays on screen for six seconds unless told otherwise', () => {
    toaster.show('Responsável cadastrado: Maria Silva.');

    vi.advanceTimersByTime(5999);
    expect(toaster.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(toaster.toasts()).toHaveLength(0);
  });

  it('dismisses only the toast asked for', () => {
    toaster.show('Primeiro.');
    toaster.show('Segundo.');

    toaster.dismiss(toaster.toasts()[0].id);

    expect(toaster.toasts().map((toast) => toast.message)).toEqual(['Segundo.']);
  });
});
