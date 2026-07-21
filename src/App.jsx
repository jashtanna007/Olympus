import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import GlobalLayout from "./components/layout/GlobalLayout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Franchises from "./pages/Franchises";
import Matches from "./pages/Matches";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login has its own layout (no navbar) */}
          <Route path="/login" element={<Login />} />

          {/* Main app with GlobalLayout */}
          <Route element={<GlobalLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/franchises" element={<Franchises />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
