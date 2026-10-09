import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class Toast {
  private nextId = 1;
  readonly messages = signal<ToastMessage[]>([]);

  success(text: string): void { this.push('success', text); }
  error(text: string): void { this.push('error', text); }
  info(text: string): void { this.push('info', text); }

  dismiss(id: number): void {
    this.messages.update(list => list.filter(m => m.id !== id));
  }

  private push(type: ToastType, text: string): void {
    const id = this.nextId++;
    this.messages.update(list => [...list, { id, type, text }]);
    setTimeout(() => this.dismiss(id), 4000);
  }
}