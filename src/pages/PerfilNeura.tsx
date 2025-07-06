import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { LoadingButton } from '../components/LoadingButton';
import { useToast } from '../hooks/useToast';
import { Brain } from 'lucide-react';

interface PerfilNeuraData {
  nomeEmpresa: string;
  nicho: string;
  subnicho: string;
  sobre: string;
  tomDeVoz: string;
  objetivo: string;
  historicoDeConteudo: string;
}

const initialData: PerfilNeuraData = {
  nomeEmpresa: '',
  nicho: '',
  subnicho: '',
  sobre: '',
  tomDeVoz: '',
  objetivo: '',
  historicoDeConteudo: ''
};

export default function PerfilNeura() {
  const [perfil, setPerfil] = useState<PerfilNeuraData>(initialData);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { success, error } = useToast();

  useEffect(() => {
    const cached = localStorage.getItem('perfil_neura');
    if (cached) {
      setPerfil(JSON.parse(cached));
      setLoadingData(false);
    }
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError || new Error("Usuário não autenticado");

      const metadata = user.user_metadata || {};
      const perfilData: PerfilNeuraData = {
        nomeEmpresa: metadata.nomeEmpresa || '',
        nicho: metadata.nicho || '',
        subnicho: metadata.subnicho || '',
        sobre: metadata.sobre || '',
        tomDeVoz: metadata.tomDeVoz || '',
        objetivo: metadata.objetivo || '',
        historicoDeConteudo: metadata.historicoDeConteudo || ''
      };

      setPerfil(perfilData);
      localStorage.setItem('perfil_neura', JSON.stringify(perfilData));
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      error('Erro ao carregar dados do perfil');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPerfil(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica antes de enviar
    if (!perfil.nomeEmpresa || !perfil.nicho || !perfil.objetivo) {
      error('Preencha pelo menos: nome da empresa, nicho e objetivo.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: perfil
      });

      if (updateError) throw updateError;

      success('Perfil NEURA atualizado com sucesso!');
      localStorage.setItem('perfil_neura', JSON.stringify(perfil));
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      error('Erro ao salvar perfil');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
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
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-800">Perfil NEURA</h1>
        </div>
        
        <p className="text-gray-600">
          Configure seu perfil de criador para que a IA possa gerar ideias mais personalizadas
          e alinhadas com sua marca.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Empresa/Marca
              </label>
              <input
                type="text"
                name="nomeEmpresa"
                value={perfil.nomeEmpresa}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ex: Agência Digital Aurora"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nicho Principal
                </label>
                <input
                  type="text"
                  name="nicho"
                  value={perfil.nicho}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Marketing Digital"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sub-nicho
                </label>
                <input
                  type="text"
                  name="subnicho"
                  value={perfil.subnicho}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Tráfego Pago"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sobre sua Marca
              </label>
              <textarea
                name="sobre"
                value={perfil.sobre}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Descreva sua marca, missão e valores..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tom de Voz
              </label>
              <input
                type="text"
                name="tomDeVoz"
                value={perfil.tomDeVoz}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ex: Profissional e educativo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objetivo Principal
              </label>
              <input
                type="text"
                name="objetivo"
                value={perfil.objetivo}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ex: Educar sobre marketing digital"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Histórico de Conteúdo
              </label>
              <textarea
                name="historicoDeConteudo"
                value={perfil.historicoDeConteudo}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Descreva os tipos de conteúdo que você já produz..."
              />
            </div>
          </div>

          <LoadingButton
            type="submit"
            loading={loading}
            className="w-full"
          >
            Salvar Perfil NEURA
          </LoadingButton>
        </form>
      </div>
    </Layout>
  );
}
