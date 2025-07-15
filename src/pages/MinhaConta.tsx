import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  telefone: z.string().min(14, 'Telefone inválido').optional().nullable(),
  dataNascimento: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string()
    .min(8, 'A nova senha deve ter no mínimo 8 caracteres')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
    .regex(/[^a-zA-Z0-9]/, 'A senha deve conter pelo menos um caractere especial'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

interface ProfileData {
  nome: string;
  email: string;
  telefone: string | null;
  dataNascimento: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
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
  scopes: string[];
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
  const [searchParams] = useSearchParams(); // Mantido caso precise para outros parâmetros
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [connections, setConnections] = useState<SocialConnection[]>([]);

  const [profile, setProfile] = useState<ProfileData>({
    nome: '', email: '', telefone: null, dataNascimento: null, endereco: null, bairro: null, cidade: null, estado: null, cep: null, avatar_url: null
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  // Função para carregar as conexões, agora com useCallback para otimização
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
      
      // Carrega os dados do perfil do usuário
      const metadata = user.user_metadata || {};
      setProfile({
        nome: metadata.nome || '', email: user.email || '', telefone: metadata.telefone || null, dataNascimento: metadata.dataNascimento || null, endereco: metadata.endereco || null, bairro: metadata.bairro || null, cidade: metadata.cidade || null, estado: metadata.estado || null, cep: metadata.cep || null, avatar_url: metadata.avatar_url || null
      });

      // Lógica para lidar com o redirecionamento OAuth
      if (window.location.hash.includes('provider_token')) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get('provider_token');
        const platform = params.get('platform');
        
        navigate('/minha-conta', { replace: true });

        if (accessToken && platform) {
          showError('Finalizando conexão, por favor aguarde...');
          try {
            const { error: saveError } = await supabase.functions.invoke('save-oauth-tokens', {
              body: { platform, accessToken }
            });

            if (saveError) throw saveError;
            success(`${PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.name || platform} conectado com sucesso!`);
            
          } catch (err) {
            console.error("Error saving OAuth tokens:", err);
            showError("Falha ao salvar a conexão com a conta.");
          }
        }
      }

      // PONTO CRÍTICO: Após processar (ou não) o hash, carrega o estado final do banco.
      await loadConnections();
      setLoading(false);
    };

    initializePage();
  // As dependências garantem que a função só roda uma vez na montagem do componente.
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

  // ... (O restante das funções como handleDisconnectPlatform, handleSaveProfile, etc., permanecem iguais)
  const handleDisconnectPlatform = async (connectionId: string, platform: string) => {
    try {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      const platformName = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.name || platform;
      success(`${platformName} desconectado com sucesso`);
      loadConnections();
    } catch (err) {
      console.error('Erro ao desconectar:', err);
      showError('Erro ao desconectar conta');
    }
  };

  // ... (O restante da sua página JSX permanece exatamente igual)
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Carregando perfil...</p>
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
            Conecte suas contas de redes sociais para coletar dados de performance e gerar insights personalizados.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(PLATFORM_CONFIG).map(([platform, config]) => {
              const connection = connections.find(c => c.platform === platform);
              const isConnected = !!connection;
              const Icon = config.icon;

              return (
                <div
                  key={platform}
                  className={`p-4 rounded-lg border-2 ${isConnected ? 'border-green-300 bg-green-50' : `${config.borderColor} ${config.bgColor}`}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-6 h-6 ${isConnected ? 'text-green-600' : config.color}`} />
                      <span className="font-medium text-gray-800">{config.name}</span>
                    </div>
                    {isConnected && <CheckCircle className="w-5 h-5 text-green-500" />}
                  </div>

                  {isConnected && connection ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          Conectado como: <strong className="text-gray-800">{connection.platform_username || 'Usuário'}</strong>
                        </p>
                        <button
                          onClick={() => handleDisconnectPlatform(connection.id, platform)}
                          className="w-full mt-3 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Desconectar
                        </button>
                      </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Não conectado</p>
                      <LoadingButton
                        onClick={() => handleConnectPlatform(platform)}
                        loading={connectingPlatform === platform}
                        className="w-full text-sm"
                      >
                        Conectar {config.name}
                      </LoadingButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {/* O resto do seu JSX para Perfil e Senha continua aqui, sem alterações */}
      </div>
    </Layout>
  );
}
