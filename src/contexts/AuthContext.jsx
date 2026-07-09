import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { ROLES, ROLE_PERMISSIONS } from "../data/mockData";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── Fetch role from the `profiles` table ───
  const fetchUserRole = useCallback(async (userId, userEmail) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error || !data) {
        // Profile doesn't exist yet — create one with default 'viewer' role
        // This handles first-time logins automatically
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .upsert({ id: userId, email: userEmail, role: ROLES.VIEWER })
          .select("role")
          .single();

        if (insertError || !newProfile) {
          console.warn("Could not create profile, defaulting to viewer:", insertError?.message);
          setRole(ROLES.VIEWER);
        } else {
          setRole(newProfile.role || ROLES.VIEWER);
        }
      } else {
        setRole(data.role || ROLES.VIEWER);
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
      setRole(ROLES.VIEWER);
    }
  }, []);

  // ─── Initialize auth state ───
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchUserRole(s.user.id, s.user.email);
      }
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchUserRole(s.user.id, s.user.email);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

  // ─── Sign in with OTP (passwordless) ───
  const signInWithOtp = useCallback(async (email) => {
    const { data, error } = await supabase.auth.signInWithOtp({ email });
    return { data, error };
  }, []);

  // ─── Verify OTP ───
  const verifyOtp = useCallback(async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    return { data, error };
  }, []);

  // ─── Sign out ───
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  }, []);

  // ─── RBAC permission helpers ───
  const isAdmin = useMemo(() => ROLE_PERMISSIONS.isAdmin(role), [role]);
  const canCreateMatch = useMemo(() => ROLE_PERMISSIONS.canCreateMatch(role), [role]);
  const canScoreMatch = useMemo(() => ROLE_PERMISSIONS.canScoreMatch(role), [role]);
  const canManageAuction = useMemo(() => ROLE_PERMISSIONS.canManageAuction(role), [role]);

  /**
   * hasRole — check if the user has a specific role.
   * Admin always passes (god-mode).
   */
  const hasRole = useCallback(
    (requiredRole) => {
      if (role === ROLES.ADMIN) return true;
      return role === requiredRole;
    },
    [role]
  );

  const value = useMemo(
    () => ({
      user,
      session,
      role,
      loading,
      // Auth actions
      signInWithOtp,
      verifyOtp,
      signOut,
      // RBAC
      isAdmin,
      canCreateMatch,
      canScoreMatch,
      canManageAuction,
      hasRole,
    }),
    [user, session, role, loading, signInWithOtp, verifyOtp, signOut, isAdmin, canCreateMatch, canScoreMatch, canManageAuction, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
