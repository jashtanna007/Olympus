import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GlobalLayout from "./components/layout/GlobalLayout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Franchises from "./pages/Franchises";
import Matches from "./pages/Matches";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<GlobalLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/franchises" element={<Franchises />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
