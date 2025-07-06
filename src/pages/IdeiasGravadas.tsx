import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { LoadingButton } from '../components/LoadingButton';
import { useToast } from '../hooks/useToast';
import { Star, Trash2, Share2, Edit2 } from 'lucide-react';

interface IdeiaGravada {
  id: string;
  conteudo: string;
  created_at: string;
  favorito?: boolean;
}

export default function IdeiasGravadas() {
  const [ideias, setIdeias] = useState<IdeiaGravada[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroData, setFiltroData] = useState('todas');
  const { success, error } = useToast();

  useEffect(() => {
    carregarIdeias();
  }, []);

  const carregarIdeias = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('ideias_virais')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filtroData !== 'todas') {
        const hoje = new Date();
        let dataInicial = new Date();

        switch (filtroData) {
          case 'hoje':
            dataInicial.setHours(0, 0, 0, 0);
            break;
          case 'semana':
            dataInicial.setDate(hoje.getDate() - 7);
            break;
          case 'mes':
            dataInicial.setMonth(hoje.getMonth() - 1);
            break;
        }

        query = query.gte('created_at', dataInicial.toISOString());
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setIdeias(data || []);
    } catch (err) {
      error('Erro ao carregar ideias');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('ideias_virais')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setIdeias(prev => prev.filter(ideia => ideia.id !== id));
      success('Ideia excluída com sucesso');
    } catch (err) {
      error('Erro ao excluir ideia');
      console.error(err);
    }
  };

  const handleShare = async (ideia: IdeiaGravada) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Ideia Viral NEURA',
          text: ideia.conteudo,
          url: window.location.href
        });
        success('Ideia compartilhada com sucesso');
      } else {
        await navigator.clipboard.writeText(ideia.conteudo);
        success('Ideia copiada para a área de transferência');
      }
    } catch (err) {
      error('Erro ao compartilhar ideia');
      console.error(err);
    }
  };

  const toggleFavorito = async (id: string, favorito: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('ideias_virais')
        .update({ favorito: !favorito })
        .eq('id', id);

      if (updateError) throw updateError;

      setIdeias(prev => prev.map(ideia => 
        ideia.id === id ? { ...ideia, favorito: !favorito } : ideia
      ));
      success(favorito ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
    } catch (err) {
      error('Erro ao atualizar favorito');
      console.error(err);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Ideias Salvas</h1>
          <select
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm"
          >
            <option value="todas">Todas as datas</option>
            <option value="hoje">Hoje</option>
            <option value="semana">Última semana</option>
            <option value="mes">Último mês</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Carregando ideias...</p>
          </div>
        ) : ideias.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Nenhuma ideia salva ainda</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {ideias.map((ideia) => (
              <div
                key={ideia.id}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <p className="text-gray-800">{ideia.conteudo}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFavorito(ideia.id, ideia.favorito || false)}
                      className={`p-2 rounded-full hover:bg-gray-100 ${
                        ideia.favorito ? 'text-yellow-500' : 'text-gray-400'
                      }`}
                    >
                      <Star className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleShare(ideia)}
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(ideia.id)}
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>
                    {new Date(ideia.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}