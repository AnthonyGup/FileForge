import { Request, Response } from 'express';
import { currentUser } from '../middlewares/authenticate';
import { loginSchema } from '../schemas/auth.schemas';
import * as authService from '../services/auth.service';
import { parse } from '../utils/validate';

export async function loginController(req: Request, res: Response): Promise<void> {
    const { email, password } = parse(loginSchema, req.body);
    const { token, user } = await authService.login(email, password);
    res.json({ token, user });
}

export function meController(req: Request, res: Response): void {
    res.json(currentUser(req));
}