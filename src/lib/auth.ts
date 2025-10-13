// Version Edge-compatible pour le middleware
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export const { auth } = NextAuth(authConfig);
