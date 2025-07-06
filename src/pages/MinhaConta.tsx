import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { LoadingButton } from '../components/LoadingButton';
import { useToast } from '../hooks/useToast';
import AvatarUploader from '../components/AvatarUploader';
import { Eye, EyeOff, AlertCircle, Youtube, Music, Instagram, CheckCircle, XCircle, Clock } from 'lucide-react';
import { z } from 'zod';

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
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  tiktok: {
    name: 'TikTok',
    icon: Music,
    color: 'text-black',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200'
  }
};

export default function MinhaConta() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [connections, setConnections] = useState<SocialConnection[]>([]);

  const [profile, setProfile] = useState<ProfileData>({
    nome: '',
    email: '',
    telefone: null,
    dataNascimento: null,
    endereco: null,
    bairro: null,
    cidade: null,
    estado: null,
    cep: null,
    avatar_url: null
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadUserProfile();
    loadConnections();
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = () => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const platform = searchParams.get('platform');
    const username = searchParams.get('username');
    const message = searchParams.get('message');

    if (success === 'connection_created' && platform) {
      const platformName = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.name || platform;
      showError(`${platformName} conectado com sucesso!${username ? ` Como: ${username}` : ''}`);
      loadConnections(); // Recarregar conexões
    } else if (error) {
      const errorMessages = {
        oauth_denied: 'Autorização cancelada pelo usuário',
        connection_failed: 'Falha ao conectar conta',
        oauth_error: 'Erro na autenticação'
      };
      showError(errorMessages[error as keyof typeof errorMessages] || message || 'Erro ao conectar conta');
    }

    // Limpar parâmetros da URL
    if (success || error) {
      navigate('/minha-conta', { replace: true });
    }
  };

  const loadUserProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        navigate('/login');
        return;
      }

      const metadata = user.user_metadata || {};
      setProfile({
        nome: metadata.nome || '',
        email: user.email || '',
        telefone: metadata.telefone || null,
        dataNascimento: metadata.dataNascimento || null,
        endereco: metadata.endereco || null,
        bairro: metadata.bairro || null,
        cidade: metadata.cidade || null,
        estado: metadata.estado || null,
        cep: metadata.cep || null,
        avatar_url: metadata.avatar_url || null
      });
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      showError('Erro ao carregar dados do perfil');
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
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Sessão não encontrada');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-oauth-flow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platform })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao iniciar conexão');
      }

      const { auth_url } = await response.json();
      
      // Redirecionar para autorização
      window.location.href = auth_url;
      
    } catch (err) {
      console.error('Erro ao conectar plataforma:', err);
      showError(err instanceof Error ? err.message : 'Erro ao conectar plataforma');
    } finally {
      setConnectingPlatform(null);
    }
  };

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

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
    setValidationErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setValidationErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleAvatarUpload = (url: string) => {
    setProfile(prev => ({ ...prev, avatar_url: url }));
  };

  const validateProfile = () => {
    try {
      profileSchema.parse(profile);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.errors.forEach(error => {
          if (error.path[0]) {
            errors[error.path[0].toString()] = error.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const validatePassword = () => {
    try {
      passwordSchema.parse(passwordData);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.errors.forEach(error => {
          if (error.path[0]) {
            errors[error.path[0].toString()] = error.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;
    
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          nome: profile.nome,
          telefone: profile.telefone,
          dataNascimento: profile.dataNascimento,
          endereco: profile.endereco,
          bairro: profile.bairro,
          cidade: profile.cidade,
          estado: profile.estado,
          cep: profile.cep,
          avatar_url: profile.avatar_url
        }
      });

      if (updateError) throw updateError;

      success('Perfil atualizado com sucesso!');
      setShowConfirmDialog(false);
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      showError('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!validatePassword()) return;

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      success('Senha atualizada com sucesso!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Erro ao atualizar senha:', err);
      showError('Erro ao atualizar senha. Verifique seus dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const getConnectionStatus = (connection: SocialConnection) => {
    if (connection.is_expired) {
      return { icon: XCircle, color: 'text-red-500', text: 'Expirado' };
    }
    
    const lastSync = new Date(connection.last_sync_at);
    const daysSinceSync = Math.floor((Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceSync > 7) {
      return { icon: Clock, color: 'text-yellow-500', text: 'Precisa sincronizar' };
    }
    
    return { icon: CheckCircle, color: 'text-green-500', text: 'Conectado' };
  };

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
              const status = connection ? getConnectionStatus(connection) : null;
              const Icon = config.icon;
              const StatusIcon = status?.icon;

              return (
                <div
                  key={platform}
                  className={`p-4 rounded-lg border-2 ${config.borderColor} ${config.bgColor}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-6 h-6 ${config.color}`} />
                      <span className="font-medium text-gray-800">{config.name}</span>
                    </div>
                    {status && StatusIcon && (
                      <StatusIcon className={`w-5 h-5 ${status.color}`} />
                    )}
                  </div>

                  {isConnected && connection ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        <strong>Canal:</strong> {connection.platform_username}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Status:</strong> {status?.text}
                      </p>
                      <p className="text-xs text-gray-500">
                        Última sincronização: {new Date(connection.last_sync_at).toLocaleDateString('pt-BR')}
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

          {connections.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                📊 Coleta de Dados Ativa
              </h3>
              <p className="text-sm text-blue-700">
                Suas contas conectadas permitirão que o NEURA colete dados de performance 
                automaticamente e gere insights personalizados sobre seus conteúdos.
              </p>
            </div>
          )}
        </div>

        {/* Seção de Perfil */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Informações Pessoais</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto de Perfil
              </label>
              <AvatarUploader
                userId={profile.email}
                avatarUrl={profile.avatar_url}
                onUpload={handleAvatarUpload}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  name="nome"
                  value={profile.nome}
                  onChange={handleProfileChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    validationErrors.nome ? 'border-red-500' : 'border-gray-300'
                  } focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
                {validationErrors.nome && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.nome}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  readOnly
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  name="telefone"
                  value={profile.telefone || ''}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  name="dataNascimento"
                  value={profile.dataNascimento || ''}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço
              </label>
              <input
                type="text"
                name="endereco"
                value={profile.endereco || ''}
                onChange={handleProfileChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Rua, número e complemento"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  name="bairro"
                  value={profile.bairro || ''}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  name="cidade"
                  value={profile.cidade || ''}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  name="estado"
                  value={profile.estado || ''}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  maxLength={2}
                  placeholder="UF"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CEP
              </label>
              <input
                type="text"
                name="cep"
                value={profile.cep || ''}
                onChange={handleProfileChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="00000-000"
              />
            </div>
          </div>

          <LoadingButton
            onClick={() => setShowConfirmDialog(true)}
            loading={saving}
            className="w-full"
          >
            Salvar Alterações
          </LoadingButton>
        </div>

        {/* Seção de Senha */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Alterar Senha</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha Atual
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    validationErrors.currentPassword ? 'border-red-500' : 'border-gray-300'
                  } focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {validationErrors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.currentPassword}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    validationErrors.newPassword ? 'border-red-500' : 'border-gray-300'
                  } focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
              </div>
              {validationErrors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.newPassword}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  } focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
              </div>
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          <LoadingButton
            onClick={handleUpdatePassword}
            loading={saving}
            variant="secondary"
            className="w-full"
          >
            Atualizar Senha
          </LoadingButton>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-semibold">Confirmar Alterações</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja salvar as alterações no seu perfil?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}