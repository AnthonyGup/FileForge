import multer from 'multer';

export const uploadSingle = multer({ storage: multer.memoryStorage() }).single('file');
