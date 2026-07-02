import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from './AuthContext';
import type { AuthContextType } from './AuthContext';
import type { Session, User } from '@supabase/supabase-js';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(prevUser => {
        const newUser = session?.user ?? null;
        if (prevUser && newUser && JSON.stringify(prevUser) === JSON.stringify(newUser)) return prevUser;
        return newUser;
      });
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(prevUser => {
        const newUser = session?.user ?? null;
        if (prevUser && newUser && JSON.stringify(prevUser) === JSON.stringify(newUser)) return prevUser;
        return newUser;
      });
      setLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value: AuthContextType = { session, user, signInWithEmail, signUpWithEmail, signOut, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
