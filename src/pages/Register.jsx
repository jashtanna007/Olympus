import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Register page — Redirects to /login since signup is handled there.
 * Kept as a route target so existing links don't break.
 */
export default function Register() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
}
