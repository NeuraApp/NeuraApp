import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "./components/ToastContainer";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MinhaConta from "./pages/MinhaConta";
import PerfilNeura from "./pages/PerfilNeura";
import IdeiaViral from "./pages/IdeiaViral";
import IdeiasGravadas from "./pages/IdeiasGravadas";
import Analytics from "./pages/Analytics";
import Preferencias from "./pages/Preferencias";
import Campanhas from "./pages/Campanhas";
import Pricing from "./pages/Pricing";
import Payment from "./pages/Payment";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import DatabaseInspection from "./pages/admin/DatabaseInspection";
import AccountSubscription from "./pages/account/Subscription";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/minha-conta" element={<ProtectedRoute><MinhaConta /></ProtectedRoute>} />
        <Route path="/perfil-neura" element={<ProtectedRoute><PerfilNeura /></ProtectedRoute>} />
        <Route path="/ideia-viral" element={<ProtectedRoute><IdeiaViral /></ProtectedRoute>} />
        <Route path="/ideias-salvas" element={<ProtectedRoute><IdeiasGravadas /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/preferencias" element={<ProtectedRoute adminOnly={true}><Preferencias /></ProtectedRoute>} />
        <Route path="/campanhas" element={<ProtectedRoute><Campanhas /></ProtectedRoute>} />
        <Route path="/admin/subscriptions" element={<ProtectedRoute><AdminSubscriptions /></ProtectedRoute>} />
        <Route path="/admin/database" element={<ProtectedRoute adminOnly={true}><DatabaseInspection /></ProtectedRoute>} />
        <Route path="/account/subscription" element={<ProtectedRoute><AccountSubscription /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;