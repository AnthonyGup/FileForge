import mongoose, { Types } from 'mongoose';
export const BUCKET_NAME = 'contents'

type Bucket = InstanceType<typeof mongoose.mongo.GridFSBucket>;

let bucket: Bucket | null = null;

export function getBucket(): Bucket {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('La base de datos no está conectada');
    }
    if (!bucket) {
        bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
    }
    return bucket;
}

/**
 * Guarda el contenido y devuelve el _id del archivo en el GridFS
 * @param buffer
 * @param filename
 * @param metadata
 */
export function uploadContent(
    buffer: Buffer,
    filename: string,
    metadata: Record<string, unknown> = {}
): Promise<Types.ObjectId> {
    return new Promise((resolve, reject) => {
        const stream = getBucket().openUploadStream(filename, { metadata });
        stream.once('error', reject);
        stream.once('finish', () => resolve(stream.id as Types.ObjectId));
        stream.end(buffer);
    });
}

/**
 * Lee el contenido completo en memoria (los archivos son de maximo 1 mb)
 * @param id el ide
 */
export async function readContent(id: Types.ObjectId): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of getBucket().openDownloadStream(id)) {
        chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
}

/**
 * flujo de lectura para enviar directamente en una respuesta HTTP
 * @param id el ide
 */
export function openContentStream(id: Types.ObjectId) {
    return getBucket().openDownloadStream(id);
}

/**
 * Elimina el contenido: si ya no existe no pasa na'
 * @param id
 */
export async function deleteContent(id: Types.ObjectId): Promise<void> {
    try {
        await getBucket().delete(id);
    } catch (err) {
        const notFound = err instanceof Error && err.message.includes('FileNotFound');
        if (!notFound) throw err;
    }
}

export async function clearContents(): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('La base de datos no está conectada');
    await db.collection(`${BUCKET_NAME}.files`).deleteMany({});
    await db.collection(`${BUCKET_NAME}.chunks`).deleteMany({});
}
