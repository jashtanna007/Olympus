import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import GlobalLayout from "./components/layout/GlobalLayout";
import { AuthProvider } from "./contexts/AuthContext";
import Franchises from "./pages/Franchises";
import AuthCallback from "./pages/AuthCallback";
import Home from "./pages/Home";
import Leaderboard from "./pages/Leaderboard";
import Login from "./pages/Login";
import Matches from "./pages/Matches";
import MatchLive from "./pages/MatchLive";
import ScorerEntry from "./pages/ScorerEntry";
import Profile from "./pages/Profile";
import Registration from "./pages/Registration";
import Auction from "./pages/Auction";
import Retention from "./pages/Retention";
import AuctionSummary from "./pages/AuctionSummary";
import GirlsAuction from "./pages/GirlsAuction";

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
                path="/matches/:matchId"
                element={<MatchLive />}
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

              {/* Auction: read-only for viewers, full controls for admin */}
              <Route
                path="/auction"
                element={<Auction />}
              />
              <Route
                path="/auction-summary"
                element={<AuctionSummary />}
              />
              <Route
                path="/girls-auction"
                element={<Navigate to="/auction?mode=female-football" replace />}
              />

              {/* Admin-only routes */}
              <Route element={<AdminRoute />}>
                <Route
                  path="/matches"
                  element={<Matches />}
                />
                <Route
                  path="/scorer/:matchId"
                  element={<ScorerEntry />}
                />
                <Route
                  path="/retention"
                  element={<Retention />}
                />
              </Route>
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
