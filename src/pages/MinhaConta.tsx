import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { LoadingButton } from '../components/LoadingButton';
import AvatarUploader from '../components/AvatarUploader';
import { useSubscription } from '../hooks/useSubscription';
import { useToast } from '../hooks/useToast';
import { 
  User, 
  Link as LinkIcon, 
  CreditCard, 
  Shield, 
  Youtube, 
  Music, 
  Instagram, 
  CheckCircle, 
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Crown
} from 'lucide-react';

// --- INTERFACES ---
interface SocialConnection {
  id: string;
  platform: string;
  platform_user_id: string;
  platform_username: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
}

// --- CONFIGURAÇÕES ---
const PLATFORM_CONFIG = {
  youtube: { name: 'YouTube', icon: Youtube, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  tiktok: { name: 'TikTok', icon: Music, color: 'text-black', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
  instagram: { name: 'Instagram', icon: Instagram, color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' }
};

const TABS = [
  { id: 'perfil', name: 'Perfil', icon: User },
  { id: 'contas', name: 'Contas Conectadas', icon: LinkIcon },
  { id: 'assinatura', name: 'Assinatura', icon: CreditCard },
  { id: 'seguranca', name: 'Segurança', icon: Shield }
];

// --- COMPONENTE PRINCIPAL ---
export default function MinhaConta() {
  const navigate = useNavigate();
  const { subscription, isPro, loading: subscriptionLoading } = useSubscription();
  const { success, error: showError } = useToast();
  
  // Estados principais
  const [activeTab, setActiveTab] = useState('perfil');
  const [loading, setLoading] = useState(true);
  const [processingOAuth, setProcessingOAuth] = useState(false);
  
  // Estados do perfil
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    email: '',
    full_name: '',
    avatar_url: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Estados das conexões sociais
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  
  // Estados da segurança
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Estados da assinatura
  const [portalLoading, setPortalLoading] = useState(false);

  // Função para carregar conexões sociais
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

  // Função para carregar dados do perfil
  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      const metadata = user.user_metadata || {};
      setProfile({
        id: user.id,
        email: user.email || '',
        full_name: metadata.nome || metadata.name || '',
        avatar_url: metadata.avatar_url || ''
      });
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      showError('Erro ao carregar dados do perfil');
    }
  }, [navigate, showError]);

  // FIXED: Strict execution order for OAuth flow and UI synchronization
  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);
      setProcessingOAuth(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      // STEP 1: Check for OAuth tokens in URL hash
      if (window.location.hash.includes('provider_token')) {
        setProcessingOAuth(true);
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get('provider_token');
        const platform = params.get('platform');
        
        // Clean URL immediately to prevent re-processing
        navigate('/minha-conta', { replace: true });

        if (accessToken && platform) {
          try {
            // STEP 2: Save OAuth tokens and WAIT for completion
            const { data: result, error: saveError } = await supabase.functions.invoke('oauth-callback', {
              body: { platform, accessToken }
            });

            if (saveError) throw saveError;

            // STEP 3: ONLY after successful save, reload connections from database
            await loadConnections();

            success(`${PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.name || platform} conectado com sucesso!`);
            
          } catch (err) {
            console.error("Error saving OAuth tokens:", err);
            showError(`Falha ao conectar ${PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]?.name || platform}. Tente novamente.`);
          } finally {
            setProcessingOAuth(false);
          }
        }
      } else {
        // STEP 4: Normal page load - just load connections
        await loadConnections();
      }

      // Load profile data
      await loadProfile();
      setLoading(false);
    };

    initializePage();
  }, [loadConnections, loadProfile, navigate, showError, success]);

  // Handlers para perfil
  const handleProfileSave = async () => {
    if (!profile.full_name.trim()) {
      showError('Nome completo é obrigatório');
      return;
    }

    setProfileLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          nome: profile.full_name,
          name: profile.full_name,
          avatar_url: profile.avatar_url
        }
      });

      if (error) throw error;
      success('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      showError('Erro ao salvar perfil');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarUpload = (url: string) => {
    setProfile(prev => ({ ...prev, avatar_url: url }));
  };

  // Handlers para conexões sociais
  const handleConnectPlatform = async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      const { data, error } = await supabase.functions.invoke('start-oauth-flow', {
        body: { platform, state: platform }
      });
      
      if (error) throw error;
      
      if (data.auth_url) {
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

  // Handlers para assinatura
  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      const { data, error } = await supabase.functions.invoke('create-stripe-portal-link', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data.portal_url) {
        window.open(data.portal_url, '_blank');
      } else {
        throw new Error('URL do portal não recebida');
      }
    } catch (err) {
      console.error('Erro ao abrir portal:', err);
      showError('Erro ao abrir portal de assinatura');
    } finally {
      setPortalLoading(false);
    }
  };

  // Handlers para segurança
  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showError('Preencha todos os campos de senha');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('Nova senha e confirmação não coincidem');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showError('Nova senha deve ter no mínimo 8 caracteres');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      success('Senha alterada com sucesso!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      showError('Erro ao alterar senha. Verifique sua senha atual.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Renderização das abas
  const renderTabContent = () => {
    switch (activeTab) {
      case 'perfil':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <AvatarUploader
                userId={profile.id}
                avatarUrl={profile.avatar_url}
                onUpload={handleAvatarUpload}
              />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Foto do Perfil</h3>
                <p className="text-sm text-gray-600">
                  Adicione uma foto para personalizar seu perfil
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Para alterar o email, entre em contato com o suporte
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <LoadingButton
                onClick={handleProfileSave}
                loading={profileLoading}
                className="px-6 py-2"
              >
                Salvar Alterações
              </LoadingButton>
            </div>
          </div>
        );

      case 'contas':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Contas Conectadas</h3>
              <p className="text-sm text-gray-600">
                Conecte suas contas para que o NEURA possa analisar a performance e gerar insights personalizados.
              </p>
            </div>
            
            {processingOAuth && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <p className="text-blue-800 font-medium">Processando conexão OAuth...</p>
                </div>
              </div>
            )}
            
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
                          disabled={processingOAuth}
                          className="w-full px-3 py-2 text-sm font-semibold text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Desconectar
                        </button>
                      ) : (
                        <LoadingButton
                          onClick={() => handleConnectPlatform(platform)}
                          loading={connectingPlatform === platform}
                          disabled={processingOAuth}
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
        );

      case 'assinatura':
        return (
          <div className="space-y-6">
            {subscriptionLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600">Carregando informações da assinatura...</p>
              </div>
            ) : !isPro ? (
              <div className="text-center py-12">
                <Crown className="w-16 h-16 text-purple-600 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Desbloqueie Todo o Potencial do NEURA
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Faça upgrade para o plano Pro e tenha acesso a ideias ilimitadas, 
                  analytics avançado e insights preditivos.
                </p>
                <button
                  onClick={() => navigate('/pricing')}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <Crown className="w-5 h-5" />
                  Upgrade para PRO
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Crown className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-800">Plano PRO Ativo</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-green-700 font-medium">Status:</p>
                      <p className="text-green-600">
                        {subscription?.status === 'active' ? 'Ativo' : 'Inativo'}
                      </p>
                    </div>
                    <div>
                      <p className="text-green-700 font-medium">Próxima cobrança:</p>
                      <p className="text-green-600">
                        {subscription?.current_period_end 
                          ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR')
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Recursos do seu plano PRO
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Ideias ilimitadas</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Analytics avançado</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Integração com redes sociais</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Suporte prioritário</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <LoadingButton
                    onClick={handleManageSubscription}
                    loading={portalLoading}
                    className="px-6 py-2 inline-flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Gerenciar Assinatura
                  </LoadingButton>
                </div>
              </div>
            )}
          </div>
        );

      case 'seguranca':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Alterar Senha</h3>
              <p className="text-sm text-gray-600">
                Mantenha sua conta segura com uma senha forte
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha Atual
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Digite sua senha atual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Digite sua nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Confirme sua nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Dicas de Segurança</h4>
                <ul className="text-xs text-yellow-700 space-y-1">
                  <li>• Use no mínimo 8 caracteres</li>
                  <li>• Inclua letras maiúsculas e minúsculas</li>
                  <li>• Adicione números e símbolos</li>
                  <li>• Evite informações pessoais</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <LoadingButton
                  onClick={handlePasswordChange}
                  loading={passwordLoading}
                  className="px-6 py-2"
                >
                  Alterar Senha
                </LoadingButton>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">
              {processingOAuth ? 'Finalizando conexão...' : 'Carregando conta...'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Minha Conta</h1>
          <p className="text-gray-600 mt-2">
            Gerencie seu perfil, conexões e configurações de conta
          </p>
        </div>

        {/* Navegação por Abas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      isActive
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Conteúdo da Aba Ativa */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </Layout>
  );
}