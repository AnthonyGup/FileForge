import { Router } from 'express';
import { loginController, meController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';

export const authRouter = Router();

authRouter.post('/login', loginController);
authRouter.get('/me', authenticate, meController);