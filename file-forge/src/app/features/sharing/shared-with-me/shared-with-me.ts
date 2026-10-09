import { Component } from '@angular/core';
import { ShareList } from '../share-list/share-list';

@Component({
  selector: 'app-shared-with-me',
  imports: [ShareList],
  templateUrl: './shared-with-me.html',
  styleUrl: './shared-with-me.scss',
})
export class SharedWithMe {}
