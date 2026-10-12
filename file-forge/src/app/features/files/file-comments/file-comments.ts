import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';
import { ApiError, Comment } from '@app/core/models';
import { CommentApi } from '@app/core/api';
import { Toast } from '@app/core/services/toast';

@Component({
  selector: 'app-file-comments',
  imports: [DatePipe],
  templateUrl: './file-comments.html',
  styleUrl: './file-comments.scss'
})
export class FileComments {
  private readonly commentApi = inject(CommentApi);
  private readonly toast = inject(Toast);

  readonly fileId = input.required<string>();
  readonly canComment = input(false);

  protected readonly comments = signal<Comment[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly text = signal('');
  protected readonly sending = signal(false);
  protected readonly sendError = signal<string | null>(null);

  private readonly refreshTick = signal(0);

  constructor() {
    toObservable(computed(() => ({ id: this.fileId(), tick: this.refreshTick() })))
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(({ id }) =>
          this.commentApi.list(id).pipe(
            catchError((e: ApiError) => {
              this.error.set(e.message);
              return of(null);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(result => {
        this.comments.set(result ?? []);
        this.loading.set(false);
      });
  }

  protected onInput(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  protected submit(): void {
    if (this.sending() || !this.text().trim()) return;
    this.sending.set(true);
    this.sendError.set(null);

    this.commentApi.create(this.fileId(), { text: this.text().trim() }).subscribe({
      next: () => {
        this.sending.set(false);
        this.text.set('');
        this.toast.success('Comentario publicado');
        this.refreshTick.update(v => v + 1);
      },
      error: (e: ApiError) => {
        this.sending.set(false);
        this.sendError.set(e.message);
        this.toast.error(e.message);
      }
    });
  }
}
