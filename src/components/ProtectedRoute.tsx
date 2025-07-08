import { useSession } from '@supabase/auth-helpers-react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const session = useSession();
  const { isAdmin, loading: adminLoading } = useAdmin();

  // Se não há sessão, redirecionar para login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Se requer admin e ainda está carregando, mostrar loading
  if (adminOnly && adminLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-purple-600 font-semibold text-lg">Verificando permissões...</div>
      </div>
    );
  }

  // Se requer admin mas usuário não é admin, redirecionar para dashboard
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}