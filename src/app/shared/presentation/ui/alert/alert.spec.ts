import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Alert, AlertVariant } from './alert';

/**
 * O aviso é o único lugar do sistema onde uma mensagem fala com quem está na tela. O que ele
 * garante é a urgência certa: uma falha interrompe a leitura, um aviso informativo espera a vez.
 */
describe('Alert', () => {
  @Component({
    selector: 'ovyx-alert-host',
    imports: [Alert],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <ovyx-alert [variant]="variant()">
        <p>Não foi possível concluir a operação.</p>
      </ovyx-alert>
    `,
  })
  class AlertHost {
    readonly variant = signal<AlertVariant>('info');
  }

  @Component({
    selector: 'ovyx-alert-defaults-host',
    imports: [Alert],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '<ovyx-alert><p>Cadastro salvo.</p></ovyx-alert>',
  })
  class AlertDefaultsHost {}

  async function render(variant: AlertVariant): Promise<ComponentFixture<AlertHost>> {
    await TestBed.configureTestingModule({ imports: [AlertHost] }).compileComponents();
    const fixture = TestBed.createComponent(AlertHost);
    fixture.componentInstance.variant.set(variant);
    fixture.detectChanges();
    return fixture;
  }

  function box(fixture: ComponentFixture<AlertHost>): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector('.alert')!;
  }

  it('interrupts the reading when it announces a failure', async () => {
    expect(box(await render('danger')).getAttribute('role')).toBe('alert');
  });

  it('waits its turn when it has nothing urgent to say', async () => {
    // `status` não interrompe quem está no meio de uma leitura; `alert` interrompe. Usar `alert`
    // para tudo treina a pessoa a ignorar o que é urgente.
    const fixture = await render('info');

    for (const variant of ['info', 'success', 'warning'] as const) {
      fixture.componentInstance.variant.set(variant);
      fixture.detectChanges();

      expect(box(fixture).getAttribute('role')).toBe('status');
    }
  });

  it('exposes the variant as data, so it is never told by colour alone', async () => {
    expect(box(await render('warning')).dataset['variant']).toBe('warning');
  });

  it('shows the message it was given', async () => {
    expect(box(await render('danger')).textContent).toContain(
      'Não foi possível concluir a operação.',
    );
  });

  it('does not claim urgency when no variant was chosen', async () => {
    // Com `danger` por omissão, todo aviso sem variante interromperia a leitura — e a distinção que
    // o catálogo apresenta como decisão deixaria de existir.
    await TestBed.configureTestingModule({ imports: [AlertDefaultsHost] }).compileComponents();
    const fixture = TestBed.createComponent(AlertDefaultsHost);
    fixture.detectChanges();

    const box = (fixture.nativeElement as HTMLElement).querySelector('.alert')!;
    expect(box.getAttribute('role')).toBe('status');
    expect((box as HTMLElement).dataset['variant']).toBe('info');
  });
});
