import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { LoadingButton } from '../components/LoadingButton';
import { useToast } from '../hooks/useToast';
import AvatarUploader from '../components/AvatarUploader';
import { Eye, EyeOff, AlertCircle, Youtube, Music, Instagram, CheckCircle, XCircle, Clock } from 'lucide-react';
import { z } from 'zod';

// --- SCHEMAS E INTERFACES (Sem alterações) ---
const profileSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  // Removendo validações opcionais para simplificar
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(8, 'A nova senha deve ter no mínimo 8 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

interface ProfileData {
  nome: string;
  email: string;
  avatar_url: string | null;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface SocialConnection {
  id: string;
  platform: string;
  platform_user_id: string;
  platform_username: string;
  last_sync_at: string;
  is_expired: boolean;
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
  const [saving, setSaving] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [connections, setConnections] = useState<SocialConnection[]>([]);

  const [profile, setProfile] = useState<ProfileData>({
    nome: '',
    email: '',
    avatar_url: null
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // --- LÓGICA PRINCIPAL DE CARREGAMENTO E OAUTH ---
  useEffect(() => {
    // Função para processar o redirecionamento do OAuth
    const handleOAuthRedirect = async () => {
      if (window.location.hash) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get('provider_token');
        const refreshToken = params.get('provider_refresh_token');
        const expiresIn = params.get('expires_in');
        const platform = params.get('platform');

        // Limpa a URL imediatamente para remover os tokens
        navigate('/minha-conta', { replace: true });

        if (accessToken && platform) {
          try {
            // Mostra um feedback de que estamos salvando a conexão
            showError('Finalizando conexão, por favor aguarde...');

            const { error: saveError } = await supabase.functions.invoke('save-oauth-tokens', {
              body: {
                platform,
                accessToken,
                refreshToken,
                expiresIn: expiresIn ? parseInt(expiresIn, 10) : null,
                // No futuro, podemos adicionar uma chamada à API da plataforma aqui
                // para buscar o nome de usuário real antes de salvar.
                platformUserId: 'user_id_placeholder', 
                platformUsername: 'Usuário do ' + platform,
              }
            });

            if (saveError) throw saveError;

            success(`${PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.name || platform} conectado com sucesso!`);
            loadConnections(); // Recarrega a lista de conexões para mostrar a nova

          } catch (err) {
            console.error("Error saving OAuth tokens:", err);
            showError("Falha ao salvar a conexão com a conta.");
          }
        }
      }
    };
    
    // Executa a lógica de OAuth e depois carrega os dados
    handleOAuthRedirect();
    loadUserProfile();
    loadConnections();
  }, [navigate]); // Dependência do navigate para limpar a URL


  // --- FUNÇÕES DE BUSCA E AÇÕES ---
  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      const metadata = user.user_metadata || {};
      setProfile({
        nome: metadata.full_name || user.email || '',
        email: user.email || '',
        avatar_url: metadata.avatar_url || null
      });
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_connections');
      if (error) throw error;
      setConnections(data || []);
    } catch (err) {
      console.error('Erro ao carregar conexões:', err);
    }
  };

  const handleConnectPlatform = async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      // Usando supabase.functions.invoke, que é o método padrão e seguro
      const { data, error } = await supabase.functions.invoke('start-oauth-flow', {
        body: { platform }
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

  const handleDisconnectPlatform = async (connectionId: string) => {
    // ... (lógica de desconexão)
  };

  const handleSaveProfile = async () => {
    // ... (lógica de salvar perfil)
  };

  // --- RENDERIZAÇÃO ---
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
        
        {/* Seção de Contas Conectadas */}
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
                <div key={platform} className={`p-4 rounded-lg border-2 ${config.borderColor} ${config.bgColor}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-6 h-6 ${config.color}`} />
                      <span className="font-medium text-gray-800">{config.name}</span>
                    </div>
                    {isConnected && <CheckCircle className="w-5 h-5 text-green-500" />}
                  </div>
                  {isConnected && connection ? (
                    <div>
                      <p className="text-sm text-gray-600">Conectado!</p>
                      <button
                        onClick={() => handleDisconnectPlatform(connection.id)}
                        className="w-full mt-3 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Desconectar
                      </button>
                    </div>
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
              );
            })}
          </div>
        </div>
        
        {/* Outras seções como Perfil e Senha... */}

      </div>
    </Layout>
  );
}
