import { createContext } from 'react';
import { AuthError } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
