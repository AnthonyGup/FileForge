import { Component, OnInit, computed, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { FileItem } from '@app/core/models';
import { Dialog } from '@app/shared/components/dialog/dialog';

const notBlank: ValidatorFn = control =>
  String(control.value ?? '').trim() ? null : { blank: true };

@Component({
  selector: 'app-file-rename-dialog',
  imports: [ReactiveFormsModule, Dialog],
  templateUrl: './file-rename-dialog.html',
  styleUrl: './file-rename-dialog.scss'
})
export class FileRenameDialog implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly file = input.required<FileItem>();
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  /** Emite el nombre completo (base + extensión). */
  readonly submitted = output<string>();
  readonly cancelled = output<void>();

  /** Extensión tal como está en el nombre actual, por ejemplo ".md". */
  protected readonly suffix = computed(() => '.' + this.file().extension);

  protected readonly form = this.fb.group({
    base: ['', [Validators.required, notBlank, Validators.maxLength(100), Validators.pattern(/^[^/\\]*$/)]]
  });

  ngOnInit(): void {
    const name = this.file().name;
    const suffixLength = this.suffix().length;
    this.form.setValue({ base: name.slice(0, name.length - suffixLength) });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    let base = this.form.controls.base.value.trim();
    if (base.toLowerCase().endsWith(this.suffix().toLowerCase())) {
      base = base.slice(0, base.length - this.suffix().length).trim();
    }
    if (!base) {
      this.form.controls.base.markAsTouched();
      this.form.controls.base.setErrors({ blank: true });
      return;
    }
    this.submitted.emit(base + this.suffix());
  }
}