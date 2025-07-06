import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ErrorMessage } from '@/components/ErrorMessage';
import { useToast } from '@/hooks/useToast';

interface IdeiaGerada {
  nome: string;
  descricao: string;
  redeSocial: string;
  potencialViral: 'alto' | 'médio' | 'baixo';
}

export default function IdeiaViral() {
  const navigate = useNavigate();
  const { success } = useToast();
  const { error, loading, handleAsyncError } = useErrorHandler();
  const [userName, setUserName] = useState<string | null>(null);
  const [ideia, setIdeia] = useState<IdeiaGerada | null>(null);

  useEffect(() => {
    carregarUsuario();
  }, []);

  const carregarUsuario = async () => {
    await handleAsyncError(async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        navigate('/login');
        return;
      }

      const nome = data.user.user_metadata?.name || data.user.user_metadata?.nome || 'Usuário';
      setUserName(nome);
    }, 'carregar_usuario', {
      customErrorMessage: 'Erro ao carregar dados do usuário'
    });
  };

  const handleLogout = async () => {
    await handleAsyncError(async () => {
      await supabase.auth.signOut();
      navigate('/login');
    }, 'logout', {
      customErrorMessage: 'Erro ao fazer logout'
    });
  };

  const gerarIdeiaComIA = async () => {
    const result = await handleAsyncError(async () => {
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
          context: 'detailed_idea_generation',
          format: 'structured'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status} ao gerar ideia`);
      }

      const ideiaGerada = await response.json();

      // Validar se a resposta tem a estrutura esperada
      if (!ideiaGerada.nome || !ideiaGerada.descricao) {
        throw new Error('Resposta da IA em formato inválido');
      }

      setIdeia(ideiaGerada);

      // Salvar no banco de dados
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { error: saveError } = await supabase
          .from('ideias_virais')
          .insert([
            {
              conteudo: JSON.stringify(ideiaGerada),
              user_id: userData.user.id,
            },
          ]);

        if (saveError) {
          console.warn('Erro ao salvar ideia:', saveError);
          // Não falhar a operação se não conseguir salvar
        }
      }

      return ideiaGerada;
    }, 'gerar_ideia', {
      customErrorMessage: 'Erro ao gerar ideia. Verifique suas configurações de IA nas Preferências.'
    });

    if (result) {
      success('Ideia gerada com sucesso!');
    }
  };

  const handleCopiar = async () => {
    if (ideia) {
      await handleAsyncError(async () => {
        const texto = `${ideia.nome}\n\n${ideia.descricao}\n\nRede Social: ${ideia.redeSocial}\nPotencial Viral: ${ideia.potencialViral}`;
        await navigator.clipboard.writeText(texto);
        success('Ideia copiada para a área de transferência!');
      }, 'copiar_ideia', {
        customErrorMessage: 'Erro ao copiar ideia'
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Olá, {userName} 👋</h1>
          <button
            onClick={handleLogout}
            className="text-sm bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg border border-red-200 transition"
          >
            Sair
          </button>
        </div>

        <section className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">💡 Gerador de Ideias Virais com IA</h2>
          <p className="text-gray-700 mb-4">
            Use inteligência artificial para gerar ideias criativas e virais para suas redes sociais
          </p>

          {error && (
            <ErrorMessage 
              error={error} 
              onRetry={gerarIdeiaComIA}
              className="mb-4"
            />
          )}

          {ideia && (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-300 mb-4 space-y-3">
              <h3 className="font-semibold text-purple-700">{ideia.nome}</h3>
              <p className="text-gray-700">{ideia.descricao}</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="bg-purple-100 px-2 py-1 rounded">
                  {ideia.redeSocial}
                </span>
                <span className={`px-2 py-1 rounded ${
                  ideia.potencialViral === 'alto' 
                    ? 'bg-green-100 text-green-700'
                    : ideia.potencialViral === 'médio'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  Potencial: {ideia.potencialViral}
                </span>
              </div>
              <button
                onClick={handleCopiar}
                className="mt-3 border border-purple-600 text-purple-600 bg-white hover:bg-purple-50 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Copiar Ideia
              </button>
            </div>
          )}

          <button
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={gerarIdeiaComIA}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Gerando ideia...
              </>
            ) : (
              'Gerar nova ideia'
            )}
          </button>
        </section>
      </div>
    </Layout>
  );
}