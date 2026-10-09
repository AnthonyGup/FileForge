import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { Sidebar } from '../sidebar/sidebar';
import { Layout } from '../../core/services/layout';
import { ToastContainer } from '../../shared/components/toast-container/toast-container';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Navbar, Sidebar, ToastContainer],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly layout = inject(Layout);
}
