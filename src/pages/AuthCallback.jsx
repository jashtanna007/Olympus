import { useEffect } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function readProviderError(location) {
  const search = new URLSearchParams(location.search);
  const hash = new URLSearchParams(
    location.hash.replace(/^#/, ""),
  );

  return (
    search.get("error_description") ||
    search.get("error") ||
    hash.get("error_description") ||
    hash.get("error") ||
    ""
  );
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, authError } = useAuth();

  useEffect(() => {
    const providerError = readProviderError(location);

    if (providerError) {
      navigate("/login", {
        replace: true,
        state: {
          authError: decodeURIComponent(providerError),
        },
      });
      return;
    }

    if (loading) return;

    if (user) {
      navigate("/", { replace: true });
      return;
    }

    navigate("/login", {
      replace: true,
      state: {
        authError:
          authError ||
          "Google sign-in could not be completed.",
      },
    });
  }, [authError, loading, location, navigate, user]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-olympus-bg px-4">
      <div className="fixed inset-0">
        <picture>
          <source
            srcSet="/backgrounds/stadium-desktop.png"
            media="(min-width: 768px)"
          />
          <img
            src="/backgrounds/stadium-mobile.png"
            alt=""
            className="h-full w-full object-cover object-top"
          />
        </picture>

        <div className="absolute inset-0 bg-gradient-to-b from-olympus-bg/40 via-olympus-bg/70 to-olympus-bg" />
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-3xl glass-strong p-8 text-center">
        <ShieldCheck className="mx-auto h-11 w-11 text-olympus-gold" />

        <h1 className="mt-5 font-display text-3xl tracking-wide text-white">
          Verifying account
        </h1>

        <p className="mt-2 text-sm text-olympus-muted">
          Confirming your institute Google identity.
        </p>

        <Loader2 className="mx-auto mt-6 h-7 w-7 animate-spin text-olympus-gold" />
      </div>
    </div>
  );
}
