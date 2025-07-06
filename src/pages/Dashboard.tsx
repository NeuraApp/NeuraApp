import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../hooks/useToast';
import { useErrorHandler } from '../hooks/useErrorHandler';

export default function Dashboard() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { error, loading: errorLoading, handleAsyncError } = useErrorHandler();
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [novaIdeia, setNovaIdeia] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const debouncedGerarIdeia = useDebounce(() => gerarIdeia(), 2000);

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          navigate('/login');
          return;
        }

        const metadata = user.user_metadata || {};
        setUserName(metadata.nome || user.email);
        setAvatarUrl(metadata.avatar_url || null);
        setUserId(user.id);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar usuário:', err);
        showError('Erro ao carregar dados do usuário');
        setLoading(false);
      }
    };

    getUser();
  }, [navigate, showError]);

  const salvarIdeiaNoSupabase = async (ideia: string, userId: string): Promise<void> => {
    try {
      if (!ideia.trim()) {
        throw new Error('A ideia não pode estar vazia');
      }

      const { error } = await supabase.from('ideias_virais').insert({
        user_id: userId,
        conteudo: ideia,
      });

      if (error) throw error;

      success('Ideia salva com sucesso!');
    } catch (err) {
      if (err instanceof Error) {
        showError(err.message);
      } else {
        showError('Erro ao salvar ideia');
      }
      throw err;
    }
  };

  const gerarIdeia = async () => {
    if (!userId) {
      showError('Usuário não autenticado');
      return;
    }

    const result = await handleAsyncError(async () => {
      setGerando(true);

      // Usar edge function em vez de chamar API diretamente
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-ideia`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: 'dashboard_quick_idea'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status} ao gerar ideia`);
      }

      const ideiaData = await response.json();
      
      // Se a resposta for um objeto estruturado, extrair o conteúdo
      let ideiaTexto: string;
      if (typeof ideiaData === 'object' && ideiaData.nome) {
        ideiaTexto = `${ideiaData.nome}\n\n${ideiaData.descricao}\n\nRede Social: ${ideiaData.redeSocial}\nPotencial: ${ideiaData.potencialViral}`;
      } else if (typeof ideiaData === 'string') {
        ideiaTexto = ideiaData;
      } else {
        ideiaTexto = ideiaData.content || 'Ideia gerada com sucesso!';
      }

      setNovaIdeia(ideiaTexto);
      await salvarIdeiaNoSupabase(ideiaTexto, userId);
      
      return ideiaTexto;
    }, 'gerar_ideia', {
      customErrorMessage: 'Erro ao gerar ideia. Verifique suas configurações de IA nas Preferências.'
    });

    setGerando(false);
  };

  const copiarIdeia = async () => {
    if (novaIdeia) {
      await handleAsyncError(async () => {
        await navigator.clipboard.writeText(novaIdeia);
        success('Ideia copiada para a área de transferência!');
      }, 'copiar_ideia', {
        customErrorMessage: 'Erro ao copiar ideia'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-purple-600 font-semibold text-lg">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <header className="flex items-center space-x-4">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-12 h-12 rounded-full border-2 border-purple-500 object-cover"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-purple-700">Painel do Criador</h1>
            <p className="text-sm text-gray-600">
              Bem-vindo, <strong>{userName}</strong>
            </p>
          </div>
        </header>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">🚀 Próximas Ações</h2>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>Gerar ideias virais com inteligência artificial</li>
            <li>Salvar e editar ideias favoritas</li>
            <li>Monitorar engajamento e alcance</li>
            <li>Compartilhar com sua comunidade</li>
          </ul>
        </section>

        <section className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
          <h3 className="text-md font-semibold text-gray-700 mb-2">💡 Ideia Gerada</h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md mb-4">
              {error.message}
              {error.details && (
                <p className="text-sm mt-1 text-red-500">{error.details}</p>
              )}
            </div>
          )}

          {novaIdeia && (
            <div className="bg-gray-50 border border-gray-300 p-4 rounded-md text-gray-800 mb-4">
              <p className="whitespace-pre-line">{novaIdeia}</p>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={debouncedGerarIdeia}
                  disabled={gerando || errorLoading}
                  className={`bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded transition ${
                    gerando || errorLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {gerando ? 'Gerando...' : 'Nova Ideia'}
                </button>
                <button
                  onClick={copiarIdeia}
                  className="border border-purple-600 text-purple-600 hover:bg-purple-50 text-sm font-medium px-4 py-2 rounded"
                >
                  Copiar Ideia
                </button>
              </div>
            </div>
          )}

          {!novaIdeia && !gerando && (
            <button
              onClick={debouncedGerarIdeia}
              disabled={gerando || errorLoading}
              className={`bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2 rounded transition ${
                gerando || errorLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Gerar nova ideia
            </button>
          )}

          {gerando && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <p className="text-sm text-gray-500">Gerando ideia com inteligência artificial...</p>
            </div>
          )}
        </section>

        <footer className="pt-4 border-t text-sm text-gray-400 text-center">
          Projeto NEURA • Dashboard v1.0
        </footer>
      </div>
    </Layout>
  );
}