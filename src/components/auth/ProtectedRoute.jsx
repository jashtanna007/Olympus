import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-neon-cyan" />
            <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-b-neon-purple" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="font-display text-sm tracking-widest text-neon-cyan/60">LOADING</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated — allow through. Role-based access is handled by individual components via RBAC.
  return <Outlet />;
}
