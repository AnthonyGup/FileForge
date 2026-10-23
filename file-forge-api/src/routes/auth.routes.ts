import { Router } from 'express';
import { loginController, meController, registerController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';

export const authRouter = Router();

authRouter.post('/login', loginController);
authRouter.post('/register', registerController);
authRouter.get('/me', authenticate, meController);