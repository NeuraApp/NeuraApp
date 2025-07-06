// 📁 components/IdeaGenerator.tsx

import React, { useState } from 'react';

export default function IdeaGenerator() {
  const [ideia, setIdeia] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const gerarNovaIdeia = async () => {
    setLoading(true);
    setErro(null);
    setIdeia(null);

    try {
      const prompt = `
Você é uma IA especialista em viralização de conteúdo para criadores digitais.
Gere uma ideia criativa, inédita e adaptada para viralizar em redes sociais. Use um tom empolgante e casual.
Formato: uma única frase direta com emoji no final.
Exemplo: "Desafie seus seguidores a recriar uma tendência esquecida 👀"
Retorne apenas a frase, sem explicações extras.
`;

      const resposta = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://neura.app',
          'X-Title': 'neura-viral-idea'
        },
        body: JSON.stringify({
          model: 'openrouter/openai/gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.9
        })
      });

      const json = await resposta.json();

      const ideiaGerada = json?.choices?.[0]?.message?.content?.trim();

      if (!ideiaGerada) throw new Error('Resposta inválida da IA');

      setIdeia(ideiaGerada);
    } catch (err: any) {
      console.error('Erro ao gerar ideia:', err);
      setErro('Erro ao gerar ideia. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 space-y-4">
      <h2 className="text-lg font-semibold text-purple-700">📌 Sua próxima ideia viral</h2>

      {loading && (
        <p className="text-gray-500 italic">Gerando ideia criativa com IA...</p>
      )}

      {!loading && erro && (
        <p className="text-red-500 bg-red-50 border border-red-200 rounded-md p-3 text-sm">
          {erro}
        </p>
      )}

      {!loading && ideia && (
        <p className="text-gray-700 text-base bg-gray-50 p-4 rounded-md border border-dashed border-purple-200">
          {ideia}
        </p>
      )}

      {!loading && !ideia && !erro && (
        <p className="text-gray-400 italic">Clique no botão para gerar uma ideia criativa...</p>
      )}

      <div className="flex gap-4">
        <button
          onClick={gerarNovaIdeia}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Gerando...' : 'Gerar nova ideia'}
        </button>
      </div>
    </div>
  );
}
