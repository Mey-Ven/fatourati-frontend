import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import CreanciersPage from "./pages/Creanciers";
import CanauxPage from "./pages/CanauxPaiement";
import CreancesPage from "./pages/Creances";
import LoginPage from "./pages/Login";
import UtilisateursPage from "./pages/Utilisateurs";
import ParamFacturierPage from "./pages/ParamFacturier";
import { AuthService } from "./services/api";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!AuthService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = AuthService.getUser();
  if (!AuthService.isAuthenticated()) return <Navigate to="/login" replace />;
  if (user?.role !== "Admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index path="/" element={<Home />} />
            <Route path="/creanciers" element={<CreanciersPage />} />
            <Route path="/param-facturier" element={<ParamFacturierPage />} />
            <Route path="/creances" element={<CreancesPage />} />
            <Route path="/canaux" element={<CanauxPage />} />
            <Route path="/utilisateurs" element={<AdminRoute><UtilisateursPage /></AdminRoute>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
