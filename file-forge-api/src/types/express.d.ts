import type { UserDoc } from '../models';

declare global {
    namespace Express {
        interface Request {
            user?: UserDoc;
        }
    }
}

export{};