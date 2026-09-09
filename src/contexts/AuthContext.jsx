import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { ROLE_PERMISSIONS, ROLES } from "../data/mockData";
import {
  parseInstituteEmail,
} from "../utils/instituteEmail";

const AuthContext = createContext(null);
const AUTH_ERROR_STORAGE_KEY = "olympus_google_auth_error";

function getStoredAuthError() {
  try {
    return sessionStorage.getItem(AUTH_ERROR_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function storeAuthError(message) {
  try {
    if (message) {
      sessionStorage.setItem(AUTH_ERROR_STORAGE_KEY, message);
    } else {
      sessionStorage.removeItem(AUTH_ERROR_STORAGE_KEY);
    }
  } catch {
    // sessionStorage may be unavailable in restricted browser modes.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(getStoredAuthError);

  const rememberAuthError = useCallback((message) => {
    const safeMessage = String(message || "");
    setAuthError(safeMessage);
    storeAuthError(safeMessage);
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError("");
    storeAuthError("");
  }, []);

  const fetchUserRole = useCallback(async (userId, userEmail) => {
    try {
      const { data: existingProfile, error: selectError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (selectError) {
        throw selectError;
      }

      if (existingProfile?.role) {
        return existingProfile.role;
      }

      const { data: createdProfile, error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            email: userEmail,
            role: ROLES.VIEWER,
          },
          {
            onConflict: "id",
          },
        )
        .select("role")
        .single();

      if (upsertError) {
        throw upsertError;
      }

      return createdProfile?.role || ROLES.VIEWER;
    } catch (error) {
      console.error("Unable to load the user role:", error);
      return ROLES.VIEWER;
    }
  }, []);

  const synchronizeSession = useCallback(
    async (nextSession) => {
      const nextUser = nextSession?.user ?? null;

      console.log("AUTH DEBUG USER:", nextUser);
      console.log("AUTH DEBUG EMAIL:", nextUser?.email);

      if (!nextUser) {
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      const identity = parseInstituteEmail(nextUser.email);

      if (!identity.allowed) {
        setSession(null);
        setUser(null);
        setRole(null);
        rememberAuthError(identity.reason);
        setLoading(false);

        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error("Unable to clear an invalid session:", error);
        }

        return;
      }

      clearAuthError();

      // Check if roll number is in the campus whitelist
      try {
        const { data: eligible } = await supabase.rpc("check_roll_eligible", {
          p_roll: identity.rollNumber,
        });
        if (eligible === false) {
          setSession(null);
          setUser(null);
          setRole(null);
          rememberAuthError(
            "Your roll number is not in the approved list. Contact the administrators."
          );
          setLoading(false);
          await supabase.auth.signOut();
          return;
        }
      } catch {
        // RPC may not exist yet (pre-migration); allow login
      }

      setSession(nextSession);
      setUser(nextUser);

      const resolvedRole = await fetchUserRole(
        nextUser.id,
        identity.email,
      );

      setRole(resolvedRole);
      setLoading(false);
    },
    [clearAuthError, fetchUserRole, rememberAuthError],
  );

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (!active) return;

      if (error) {
        console.error("Unable to restore the auth session:", error);
        setLoading(false);
        return;
      }

      await synchronizeSession(currentSession);
    }

    void restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => {
        if (active) {
          void synchronizeSession(nextSession);
        }
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [synchronizeSession]);

  const signInWithGoogle = useCallback(async () => {
    clearAuthError();

    const redirectTo = `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      rememberAuthError(
        error.message || "Google sign-in could not be started.",
      );
    }

    return { data, error };
  }, [clearAuthError, rememberAuthError]);

  const signOut = useCallback(async () => {
    clearAuthError();

    const { error } = await supabase.auth.signOut();

    setUser(null);
    setSession(null);
    setRole(null);

    return { error };
  }, [clearAuthError]);

  const instituteIdentity = useMemo(
    () => parseInstituteEmail(user?.email),
    [user?.email],
  );

  const isAdmin = useMemo(
    () => ROLE_PERMISSIONS.isAdmin(role),
    [role],
  );

  const canCreateMatch = useMemo(
    () => ROLE_PERMISSIONS.canCreateMatch(role),
    [role],
  );

  const canScoreMatch = useMemo(
    () => ROLE_PERMISSIONS.canScoreMatch(role),
    [role],
  );

  const canManageAuction = useMemo(
    () => ROLE_PERMISSIONS.canManageAuction(role),
    [role],
  );

  const hasRole = useCallback(
    (requiredRole) => {
      if (role === ROLES.ADMIN) return true;
      return role === requiredRole;
    },
    [role],
  );

  const value = useMemo(
    () => ({
      user,
      session,
      role,
      loading,
      authError,
      rollNumber: instituteIdentity.allowed
        ? instituteIdentity.rollNumber
        : null,
      signInWithGoogle,
      signOut,
      clearAuthError,
      isAdmin,
      canCreateMatch,
      canScoreMatch,
      canManageAuction,
      hasRole,
    }),
    [
      user,
      session,
      role,
      loading,
      authError,
      instituteIdentity,
      signInWithGoogle,
      signOut,
      clearAuthError,
      isAdmin,
      canCreateMatch,
      canScoreMatch,
      canManageAuction,
      hasRole,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
