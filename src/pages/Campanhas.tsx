import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { LoadingButton } from '../components/LoadingButton';
import { useToast } from '../hooks/useToast';
import { 
  Target, 
  Calendar, 
  Plus, 
  Play, 
  Pause, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

interface Campanha {
  id: string;
  objetivo_principal: string;
  data_inicio: string;
  data_fim: string;
  status: 'rascunho' | 'ativa' | 'concluida' | 'pausada';
  created_at: string;
  total_etapas?: number;
  etapas_publicadas?: number;
}

interface NovaCampanhaForm {
  objetivo_principal: string;
  data_inicio: string;
  data_fim: string;
}

export default function Campanhas() {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState<NovaCampanhaForm>({
    objetivo_principal: '',
    data_inicio: '',
    data_fim: ''
  });

  useEffect(() => {
    carregarCampanhas();
  }, []);

  const carregarCampanhas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar campanhas com estatísticas
      const { data: campanhasData, error: campanhasError } = await supabase
        .from('campaign_analytics')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (campanhasError) throw campanhasError;

      setCampanhas(campanhasData || []);
    } catch (err) {
      console.error('Erro ao carregar campanhas:', err);
      error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.objetivo_principal || !formData.data_inicio || !formData.data_fim) {
      error('Preencha todos os campos obrigatórios');
      return;
    }

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-campanha`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status} ao gerar campanha`);
      }

      const campanhaGerada = await response.json();
      
      success(`Campanha "${formData.objetivo_principal}" criada com ${campanhaGerada.etapas.length} etapas!`);
      
      // Resetar formulário e recarregar lista
      setFormData({ objetivo_principal: '', data_inicio: '', data_fim: '' });
      setShowForm(false);
      carregarCampanhas();
      
      // Navegar para detalhes da campanha
      navigate(`/campanhas/${campanhaGerada.campanha.id}`);
      
    } catch (err) {
      console.error('Erro ao gerar campanha:', err);
      error(err instanceof Error ? err.message : 'Erro ao gerar campanha');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ativa':
        return <Play className="w-5 h-5 text-green-600" />;
      case 'pausada':
        return <Pause className="w-5 h-5 text-yellow-600" />;
      case 'concluida':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativa':
        return 'bg-green-100 text-green-800';
      case 'pausada':
        return 'bg-yellow-100 text-yellow-800';
      case 'concluida':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Carregando campanhas...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Campanhas Estratégicas</h1>
            <p className="text-gray-600 mt-1">
              Planeje sequências coordenadas de conteúdo para seus lançamentos
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova Campanha
          </button>
        </div>

        {/* Formulário de Nova Campanha */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Criar Nova Campanha</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objetivo Principal *
                </label>
                <input
                  type="text"
                  value={formData.objetivo_principal}
                  onChange={(e) => setFormData(prev => ({ ...prev, objetivo_principal: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Lançar meu curso de edição de vídeo"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Fim *
                  </label>
                  <input
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_fim: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <LoadingButton
                  type="submit"
                  loading={generating}
                  className="flex-1"
                >
                  {generating ? 'Gerando Campanha...' : 'Gerar Campanha Estratégica'}
                </LoadingButton>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Campanhas */}
        {campanhas.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Nenhuma campanha criada ainda
            </h3>
            <p className="text-gray-600 mb-6">
              Crie sua primeira campanha estratégica para coordenar seus lançamentos
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Criar Primeira Campanha
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {campanhas.map((campanha) => (
              <div
                key={campanha.id}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/campanhas/${campanha.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {campanha.objetivo_principal}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(campanha.data_inicio).toLocaleDateString('pt-BR')} - {' '}
                          {new Date(campanha.data_fim).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(campanha.status)}`}>
                      {getStatusIcon(campanha.status)}
                      {campanha.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{campanha.total_etapas || 0} etapas planejadas</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>{campanha.etapas_publicadas || 0} publicadas</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>Score médio: {campanha.score_medio_ganchos?.toFixed(1) || 'N/A'}</span>
                  </div>
                </div>

                {/* Barra de Progresso */}
                {campanha.total_etapas && campanha.total_etapas > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progresso da campanha</span>
                      <span>
                        {Math.round(((campanha.etapas_publicadas || 0) / campanha.total_etapas) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${((campanha.etapas_publicadas || 0) / campanha.total_etapas) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}