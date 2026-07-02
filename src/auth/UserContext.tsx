import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'operator' | 'designer' | 'marketer' | null;

interface UserContextType {
  role: UserRole;
  currentOrgId: string | null;
  orgName: string | null;
  loadingRole: boolean;
  isSuperAdmin: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);
  const lastProcessedUserId = useRef<string | null>(null);

  const fetchUserRole = useCallback(async () => {
    if (user?.id === lastProcessedUserId.current) return;
    setLoadingRole(true);
    lastProcessedUserId.current = user?.id || null;
    setIsSuperAdmin(false);
    setRole(null);
    setCurrentOrgId(null);
    setOrgName(null);

    if (!user) {
      setLoadingRole(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profile?.username === 'superadmin') {
        setIsSuperAdmin(true);
        setRole('admin');
        setLoadingRole(false);
        return;
      }

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id, role, status, organizations(name)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (membership) {
          if (membership.status === 'inactive') {
              await supabase.auth.signOut();
              setRole(null);
              setCurrentOrgId(null);
              setLoadingRole(false);
              return;
          }
          setCurrentOrgId(membership.organization_id);
          setRole(membership.role as UserRole);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setOrgName((membership as any).organizations?.name || null);
      } else {
          setRole(null);
      }

    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole(null);
    } finally {
      setLoadingRole(false);
    }
  }, [user]);

  useEffect(() => {
    /* eslint-disable-next-line */
    fetchUserRole();
  }, [fetchUserRole]);

  const switchOrganization = async (orgId: string) => {
    if (!user) return;
    setLoadingRole(true);
    const { data } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();
    if (data) {
      setCurrentOrgId(orgId);
      setRole(data.role as UserRole);
    }
    setLoadingRole(false);
  };

  return (
    <UserContext.Provider value={{ role, currentOrgId, orgName, loadingRole, isSuperAdmin, switchOrganization }}>
      {children}
    </UserContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUserRole = () => {
  const context = useContext(UserContext);
  if (context === undefined) throw new Error('useUserRole must be used within UserProvider');
  return context;
};
