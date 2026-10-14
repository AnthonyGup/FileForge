import { Activity } from './activity.model';
import { Comment } from './comment.model';
import { File } from './file.model';
import { Folder } from './folder.model';
import { Share } from './share.model';
import { User } from './user.model';

export * from './constants';
export * from './common.schemas';
export * from './user.model';
export * from './folder.model';
export * from './file.model';
export * from './share.model';
export * from './comment.model';
export * from './activity.model';

const ALL_MODELS = [User, Folder, File, Share, Comment, Activity];

/** Crea las colecciones y sincroniza los índices con los schemas (quita los que sobren). */
export async function ensureIndexes(): Promise<void> {
  for (const model of ALL_MODELS) {
    await model.init();
    await model.syncIndexes();
  }
}
