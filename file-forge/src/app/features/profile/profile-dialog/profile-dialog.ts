import { Component, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError, UpdateProfileRequest } from '@app/core/models';
import { Auth } from '@app/core/services/auth';
import { Toast } from '@app/core/services/toast';
import { Dialog } from '@app/shared/components/dialog/dialog';

@Component({
  selector: 'app-profile-dialog',
  imports: [ReactiveFormsModule, Dialog],
  templateUrl: './profile-dialog.html',
  styleUrl: './profile-dialog.scss'
})
export class ProfileDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(Auth);
  private readonly toast = inject(Toast);

  readonly closed = output<void>();

  private readonly user = this.auth.user();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.group({
    name: [this.user?.name ?? '', [Validators.required, Validators.maxLength(100)]],
    email: [this.user?.email ?? '', [Validators.required, Validators.email]],
    currentPassword: [''],
    newPassword: ['', [Validators.minLength(6)]],
    confirm: ['']
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, currentPassword, newPassword, confirm } = this.form.getRawValue();

    if (newPassword && !currentPassword) {
      this.error.set('Ingresa tu contraseña actual para cambiarla');
      return;
    }

    if (newPassword !== confirm) {
      this.error.set('Las contraseñas nuevas no coinciden');
      return;
    }

    const payload: UpdateProfileRequest = {
      name: name.trim(),
      email: email.trim()
    };

    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    this.saving.set(true);
    this.error.set(null);

    this.auth.updateProfile(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Perfil actualizado');
        this.closed.emit();
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        this.error.set(e.message ?? 'No se pudo actualizar el perfil');
      }
    });
  }

  protected toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }
}
