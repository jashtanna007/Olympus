import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GlobalLayout from "./components/layout/GlobalLayout";
import { AuthProvider } from "./contexts/AuthContext";
import Franchises from "./pages/Franchises";
import AuthCallback from "./pages/AuthCallback";
import Home from "./pages/Home";
import Leaderboard from "./pages/Leaderboard";
import Login from "./pages/Login";
import Matches from "./pages/Matches";
import Profile from "./pages/Profile";
import Registration from "./pages/Registration";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/auth/callback"
            element={<AuthCallback />}
          />

          <Route element={<ProtectedRoute />}>
            <Route element={<GlobalLayout />}>
              <Route path="/" element={<Home />} />
              <Route
                path="/franchises"
                element={<Franchises />}
              />
              <Route
                path="/matches"
                element={<Matches />}
              />
              <Route
                path="/leaderboard"
                element={<Leaderboard />}
              />
              <Route
                path="/profile"
                element={<Profile />}
              />
              <Route
                path="/register"
                element={<Registration />}
              />
            </Route>
          </Route>

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
