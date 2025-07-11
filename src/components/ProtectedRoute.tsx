import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

// Este componente é uma tela de carregamento simples para a verificação.
const LoadingLayout = () => (
  <div className="flex justify-center items-center h-screen bg-gray-50">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
  </div>
);

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  // Estado para saber se a verificação inicial já terminou.
  const [loading, setLoading] = useState(true);
  // Estado para armazenar o usuário, se existir.
  const [user, setUser] = useState<User | null>(null);
  // Estado para verificar se o usuário é admin.
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // onAuthStateChange é a forma mais robusta de ouvir o status da autenticação.
    // Ele é acionado na carga inicial e sempre que o login/logout acontece.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        // Se a rota for apenas para admin e tivermos um usuário, verificamos a role.
        if (currentUser && adminOnly) {
          try {
            const { data } = await supabase.rpc('is_admin');
            setIsAdmin(data);
          } catch(e) {
            console.error("Erro ao verificar permissão de admin:", e);
            setIsAdmin(false);
          }
        }
        
        // A verificação foi concluída, podemos parar de mostrar o loading.
        setLoading(false);
      }
    );

    return () => {
      // Limpa o listener quando o componente é desmontado para evitar memory leaks.
      authListener.subscription.unsubscribe();
    };
  }, [adminOnly]);

  // 1. Enquanto a verificação está em andamento, mostramos a tela de carregamento.
  //    Esta é a correção principal para o problema de redirecionamento.
  if (loading) {
    return <LoadingLayout />;
  }

  // 2. Após a verificação, se não houver usuário, redireciona para a página de login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Se a rota exige admin e o usuário não é admin, redireciona para o dashboard.
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Se todas as verificações passaram, renderiza a página solicitada.
  return <>{children}</>;
};

export default ProtectedRoute;
