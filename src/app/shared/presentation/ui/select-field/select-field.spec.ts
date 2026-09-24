import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { SelectField } from './select-field';

@Component({
  imports: [SelectField],
  template: `
    <ovyx-select-field
      controlId="role"
      label="Perfil"
      [control]="control"
      [options]="options"
      [error]="error"
    />
  `,
})
class RoleChoice {
  readonly control = new FormControl('USER', { nonNullable: true });
  readonly options = [
    { value: 'USER', label: 'Usuário' },
    { value: 'ADMINISTRATOR', label: 'Administrador' },
  ];
  error: string | undefined;
}

/** Campo de escolha: o mesmo contrato do `ovyx-form-field`, com uma lista fechada de opções. */
describe('SelectField', () => {
  function render(error?: string) {
    TestBed.configureTestingModule({ imports: [RoleChoice] });
    const fixture = TestBed.createComponent(RoleChoice);
    fixture.componentInstance.error = error;
    fixture.detectChanges();
    return fixture;
  }

  it('labels the choice and offers every option, in order', () => {
    const element = render().nativeElement as HTMLElement;
    const select = element.querySelector('select')!;

    expect(element.querySelector('label')?.getAttribute('for')).toBe('role');
    expect(select.id).toBe('role');
    expect(Array.from(select.options).map((option) => option.text.trim())).toEqual(['Usuário', 'Administrador']);
  });

  it('writes the chosen option into the control', () => {
    const fixture = render();
    const select = (fixture.nativeElement as HTMLElement).querySelector('select')!;

    select.value = 'ADMINISTRATOR';
    select.dispatchEvent(new Event('change'));

    expect(fixture.componentInstance.control.value).toBe('ADMINISTRATOR');
  });

  it('ties the refusal to the choice, so the screen reader reads them together', () => {
    const element = render('Informe o perfil.').nativeElement as HTMLElement;
    const select = element.querySelector('select')!;

    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector(`#${select.getAttribute('aria-describedby')}`)?.textContent).toContain(
      'Informe o perfil.',
    );
  });
});
