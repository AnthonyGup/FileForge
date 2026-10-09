import { Component, OnInit, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Dialog } from '@app/shared/components/dialog/dialog';

const notBlank: ValidatorFn = control =>
  String(control.value ?? '').trim() ? null : { blank: true };

@Component({
  selector: 'app-folder-name-dialog',
  imports: [ReactiveFormsModule, Dialog],
  templateUrl: './folder-name-dialog.html'
})
export class FolderNameDialog implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly title = input.required<string>();
  readonly initialName = input('');
  readonly submitLabel = input('Guardar');
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<string>();
  readonly cancelled = output<void>();

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(100), Validators.pattern(/^[^/\\]*$/)]]
  });

  ngOnInit(): void {
    this.form.setValue({ name: this.initialName() });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.controls.name.value.trim());
  }
}