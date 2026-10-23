import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@app/core/models';
import { Auth } from '@app/core/services/auth';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly form = this.fb.group(
    {
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', [Validators.required]]
    },
    { validators: this.passwordsMatch }
  );

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { name, email, password } = this.form.getRawValue();
    this.auth.register({ name, email, password }).subscribe({
      next: () => this.router.navigateByUrl('/explorer'),
      error: (e: ApiError) => {
        this.error.set(e.message ?? 'No se pudo crear la cuenta');
        this.loading.set(false);
      }
    });
  }

  protected toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  private passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirm')?.value;
    return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
  }
}
