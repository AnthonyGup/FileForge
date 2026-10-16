import { connectDb, disconnectDb } from '../config/db';
import { Folder, PermissionLevel, Share, User } from '../models';
import {Permission} from "../services/permission.service";

async function main(): Promise<void> {
    const [folderId, email, permission] = process.argv.slice(2);

    if (!folderId || !email || !['read', 'comment', 'edit'].includes(permission)) {
        console.log('Uso: npx tsx src/scripts/share-temp.ts <folderId> <email> <read|comment|edit>');
        return;
    }

    await connectDb();

    const folder = await Folder.findById(folderId);
    const user = await User.findOne({ email });
    if (!folder || !user) {
        throw new Error('Carpeta o usuario no encontrado');
    }

    await Share.updateOne(
        {resourceType: 'folder', resourceId: folder._id, sharedWithId: user._id },
        { $set: { ownerId: folder.ownerId, permission: permission as PermissionLevel }},
        { upsert: true }
    );

    console.log(`"${folder.name}" compartida con ${email} (${permission})`);
    await disconnectDb();
}

main().catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});