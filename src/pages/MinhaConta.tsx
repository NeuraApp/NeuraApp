import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { LoadingButton } from '../components/LoadingButton';
import { useToast } from '../hooks/useToast';
import { Youtube, Music, Instagram, CheckCircle } from 'lucide-react';

// --- INTERFACES E CONFIGURAÇÕES ---
interface SocialConnection {
  id: string;
  platform: string;
  platform_user_id: string;
  platform_username: string;
}

const PLATFORM_CONFIG = {
  youtube: { name: 'YouTube', icon: Youtube, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  tiktok: { name: 'TikTok', icon: Music, color: 'text-black', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
  instagram: { name: 'Instagram', icon: Instagram, color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' }
};

// --- COMPONENTE PRINCIPAL ---
export default function MinhaConta() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [connections, setConnections] = useState<SocialConnection[]>([]);

  // Função para carregar as conexões
  const loadConnections = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_connections');
      if (error) throw error;
      setConnections(data || []);
    } catch (err) {
      console.error('Erro ao carregar conexões:', err);
      showError('Não foi possível carregar suas conexões.');
    }
  }, [showError]);

  // useEffect UNIFICADO para lidar com toda a lógica de inicialização da página
  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      // Lógica para lidar com o redirecionamento OAuth
      if (window.location.hash.includes('provider_token')) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get('provider_token');
        const platform = params.get('platform');
        
        navigate('/minha-conta', { replace: true });

        if (accessToken && platform) {
          showError('Finalizando conexão, por favor aguarde...');
          try {
            const { data: result, error: saveError } = await supabase.functions.invoke('save-oauth-tokens', {
              body: { platform, accessToken }
            });

            if (saveError) throw saveError;

            // ATUALIZAÇÃO DIRETA E FORÇADA DO ESTADO
            setConnections(prevConnections => {
              const otherConnections = prevConnections.filter(c => c.platform !== platform);
              return [...otherConnections, result.connection];
            });

            success(`${PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.name || platform} conectado com sucesso!`);
            
          } catch (err) {
            console.error("Error saving OAuth tokens:", err);
            showError("Falha ao salvar a conexão com a conta.");
          }
        }
      } else {
        await loadConnections();
      }

      setLoading(false);
    };

    initializePage();
  }, [loadConnections, navigate, showError, success]);


  const handleConnectPlatform = async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      const { data, error } = await supabase.functions.invoke('start-oauth-flow', {
        body: { platform, state: platform }
      });
      if (error) throw error;
      if(data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        throw new Error("URL de autorização não recebida do servidor.");
      }
    } catch (err) {
      console.error('Erro ao iniciar conexão:', err);
      showError(err instanceof Error ? err.message : 'Erro ao conectar plataforma');
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnectPlatform = async (platform: string) => {
    const connection = connections.find(c => c.platform === platform);
    if (!connection) return;

    try {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;

      success(`${PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.name || platform} desconectado com sucesso.`);
      setConnections(prev => prev.filter(c => c.platform !== platform));
    } catch (err) {
      console.error('Erro ao desconectar:', err);
      showError('Erro ao desconectar conta.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-gray-800">Minha Conta</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Contas Conectadas</h2>
          <p className="text-sm text-gray-600">
            Conecte suas contas para que o NEURA possa analisar a performance e gerar insights.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(PLATFORM_CONFIG).map(([platform, config]) => {
              const connection = connections.find(c => c.platform === platform);
              const isConnected = !!connection;
              const Icon = config.icon;

              return (
                <div key={platform} className={`p-4 rounded-lg border-2 flex flex-col justify-between ${isConnected ? 'border-green-300 bg-green-50' : `${config.borderColor} ${config.bgColor}`}`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-6 h-6 ${isConnected ? 'text-green-600' : config.color}`} />
                        <span className="font-bold text-gray-800">{config.name}</span>
                      </div>
                      {isConnected && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>
                    {isConnected && connection ? (
                      <p className="text-sm text-gray-600">
                        Conectado como: <br/>
                        <strong className="text-gray-800">{connection.platform_username || 'Usuário'}</strong>
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">Não conectado.</p>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnectPlatform(platform)}
                        className="w-full px-3 py-2 text-sm font-semibold text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Desconectar
                      </button>
                    ) : (
                      <LoadingButton
                        onClick={() => handleConnectPlatform(platform)}
                        loading={connectingPlatform === platform}
                        className="w-full text-sm"
                      >
                        Conectar {config.name}
                      </LoadingButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
