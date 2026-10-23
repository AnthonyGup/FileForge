import { ISODateString, UserRef } from './common.model';

export interface Comment {
  id: string;
  fileId: string;
  author: UserRef; // embebido
  text: string;
  createdAt: ISODateString;
}

export interface CreateCommentRequest {
  text: string;
}

export interface UpdateCommentRequest {
  text: string;
}
