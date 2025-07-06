import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  Brain, 
  TrendingUp, 
  Users, 
  BarChart2, 
  ShieldCheck, 
  HelpCircle,
  Star,
  Quote
} from 'lucide-react';

// --- COMPONENTES AUXILIARES PARA ORGANIZAÇÃO ---

// Componente para o card de feature
const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
    <div className="flex items-center justify-center w-12 h-12 bg-purple-100 text-purple-600 rounded-lg mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{children}</p>
  </div>
);

// Componente para o card de depoimento
const TestimonialCard = ({ name, handle, image, metric, children }: { name: string, handle: string, image: string, metric: string, children: React.ReactNode }) => (
  <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-lg flex flex-col h-full">
    <Quote className="w-10 h-10 text-purple-200 mb-4" />
    <p className="text-gray-600 italic flex-grow">"{children}"</p>
    <div className="mt-6">
       <div className="flex items-center gap-4">
        <img className="w-14 h-14 rounded-full object-cover border-2 border-purple-200" src={image} alt={name} />
        <div>
          <p className="font-bold text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">{handle}</p>
        </div>
      </div>
      <div className="bg-purple-50 text-purple-700 font-semibold text-center py-2 px-4 rounded-md mt-4 border border-purple-200">
        {metric}
      </div>
    </div>
  </div>
);

// Componente para o item do FAQ
const FaqItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 py-5">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left gap-4">
        <span className="text-lg font-medium text-gray-800">{question}</span>
        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-purple-100 rounded-full">
          <ArrowRight className={`w-5 h-5 text-purple-600 transition-transform duration-300 ${isOpen ? 'transform rotate-90' : ''}`} />
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 mt-4' : 'max-h-0'}`}>
        <p className="text-gray-600 leading-relaxed pr-12">{answer}</p>
      </div>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL DA LANDING PAGE ---

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const pricingPlans = {
    monthly: [
      { name: 'Free', price: 'R$0', features: ['5 ideias/dia', 'Análise básica', 'Suporte via comunidade'], cta: 'Começar Grátis', href: '/register' },
      { name: 'Pro', price: 'R$47', features: ['Ideias ilimitadas', 'Analytics Avançado', 'Perfil NEURA Personalizado', 'Suporte prioritário'], cta: 'Assinar o Pro', href: '/register?plan=pro', popular: true },
      { name: 'Enterprise', price: 'R$197', features: ['Tudo do Pro', 'Múlti-usuários', 'Acesso à API', 'Suporte dedicado'], cta: 'Fale Conosco', href: '/contact' },
    ],
    yearly: [
      { name: 'Free', price: 'R$0', features: ['5 ideias/dia', 'Análise básica', 'Suporte via comunidade'], cta: 'Começar Grátis', href: '/register' },
      { name: 'Pro', price: 'R$37', features: ['Ideias ilimitadas', 'Analytics Avançado', 'Perfil NEURA Personalizado', 'Suporte prioritário'], cta: 'Assinar o Pro', href: '/register?plan=pro', popular: true },
      { name: 'Enterprise', price: 'R$157', features: ['Tudo do Pro', 'Múlti-usuários', 'Acesso à API', 'Suporte dedicado'], cta: 'Fale Conosco', href: '/contact' },
    ],
  };

  const testimonials = [
    { name: 'Julia Alves', handle: '@juliacriativa', image: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 20) + 1}`, metric: '+2 Milhões de views no TikTok', children: 'A NEURA acabou com meu bloqueio criativo. Todo dia tenho ideias frescas e alinhadas com o que meu público ama. É minha arma secreta!' },
    { name: 'Marcos Lacerda', handle: 'Agência MKT Boost', image: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 20) + 21}`, metric: 'Economizo 10h/semana por cliente', children: 'Gerenciamos 15 contas. A NEURA otimizou nosso processo de ideação de uma forma que planilhas e reuniões jamais conseguiriam. Essencial.' },
    { name: 'Beatriz Costa', handle: '@BeaFit', image: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 20) + 41}`, metric: '+300% de engajamento', children: 'Meu canal sobre vida saudável decolou! A IA entende meu nicho e sugere pautas que geram comentários e compartilhamentos como nunca.' },
  ];

  return (
    <div className="bg-gray-50 text-gray-800 antialiased">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-200/80">
        <nav className="max-w-7xl mx-auto flex justify-between items-center p-4">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-800 tracking-tighter">NEURA</span>
          </Link>
          <div className="hidden md:flex gap-6 items-center">
            <a href="#features" className="font-medium text-gray-600 hover:text-purple-600 transition-colors">Funcionalidades</a>
            <a href="#pricing" className="font-medium text-gray-600 hover:text-purple-600 transition-colors">Preços</a>
            <a href="#testimonials" className="font-medium text-gray-600 hover:text-purple-600 transition-colors">Depoimentos</a>
            <a href="#faq" className="font-medium text-gray-600 hover:text-purple-600 transition-colors">FAQ</a>
          </div>
          <div className="flex gap-2 items-center">
            <Link to="/login" className="px-5 py-2.5 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition-colors">
              Entrar
            </Link>
            <Link to="/register" className="px-5 py-2.5 text-white bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2">
              Começar Grátis <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-white backdrop-blur-xl"></div>
            <div className="absolute inset-0 opacity-20">
                <div className="absolute -left-40 -top-40 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute -right-40 -bottom-60 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 py-24 px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
                  Sua Fábrica de <span className="text-purple-600">Conteúdo Viral</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                  Dê adeus ao bloqueio criativo. A NEURA é sua co-piloto de IA que gera ideias, roteiros e legendas com alto potencial de viralização, personalizadas para sua marca.
                </p>
                <Link to="/register" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-10 rounded-lg text-lg transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl">
                  Receber minhas primeiras ideias virais (Grátis)
                </Link>
                
                {/* Mockup Conceitual do Produto */}
                <div className="relative mt-20 max-w-4xl mx-auto bg-white/50 p-4 rounded-xl shadow-2xl border border-gray-200/80">
                    <div className="h-6 bg-gray-200 rounded-t-lg flex items-center gap-1.5 px-3">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="p-4 grid grid-cols-12 gap-4 h-80 bg-white">
                        <div className="col-span-3 bg-gray-100 rounded-lg p-2 space-y-2">
                           <div className="h-8 bg-purple-200 rounded"></div>
                           <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                           <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                        </div>
                        <div className="col-span-9 bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="h-10 bg-gray-200 rounded"></div>
                            <div className="h-20 bg-purple-100 rounded-lg flex items-center p-3 gap-2">
                               <Sparkles className="w-6 h-6 text-purple-500" />
                               <div className="h-4 bg-purple-300 rounded w-4/6"></div>
                            </div>
                            <div className="h-20 bg-blue-100 rounded-lg flex items-center p-3 gap-2">
                               <Zap className="w-6 h-6 text-blue-500" />
                               <div className="h-4 bg-blue-300 rounded w-5/6"></div>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </div>
        </section>

        {/* Seções seguintes... (usando a estrutura já definida) */}
        
        {/* How it Works */}
        <section className="py-20 px-4 bg-white" id="features">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900">Como a Mágica Acontece em 3 Passos</h2>
              <p className="text-lg text-gray-600 mt-4">Transforme sua estratégia de conteúdo em minutos.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 text-center relative">
              <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gray-200" style={{zIndex: 0}}></div>
              <div className="relative z-10 bg-white p-4">
                <div className="flex items-center justify-center w-24 h-24 bg-purple-600 text-white text-4xl font-bold rounded-full mx-auto mb-4 border-8 border-white shadow-lg">1</div>
                <h3 className="text-xl font-semibold mb-2 mt-6">Configure seu Perfil</h3>
                <p className="text-gray-600">Informe seu nicho, tom de voz, e objetivos. A IA aprende quem você é.</p>
              </div>
              <div className="relative z-10 bg-white p-4">
                <div className="flex items-center justify-center w-24 h-24 bg-purple-600 text-white text-4xl font-bold rounded-full mx-auto mb-4 border-8 border-white shadow-lg">2</div>
                <h3 className="text-xl font-semibold mb-2 mt-6">Gere Ideias Sob Demanda</h3>
                <p className="text-gray-600">Peça ideias de vídeos, roteiros ou posts. Receba dezenas de opções em segundos.</p>
              </div>
              <div className="relative z-10 bg-white p-4">
                <div className="flex items-center justify-center w-24 h-24 bg-purple-600 text-white text-4xl font-bold rounded-full mx-auto mb-4 border-8 border-white shadow-lg">3</div>
                <h3 className="text-xl font-semibold mb-2 mt-6">Crie, Analise e Otimize</h3>
                <p className="text-gray-600">Use nosso Analytics para ver o que funciona e refinar sua estratégia continuamente.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Features */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900">Mais que um gerador de ideias, uma plataforma de crescimento</h2>
              <p className="text-lg text-gray-600 mt-4">Ferramentas poderosas para cada etapa do seu processo criativo.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard icon={<Brain className="w-6 h-6" />} title="Perfil NEURA Inteligente">
                Sua marca tem uma personalidade. Nossa IA aprende e se adapta a ela, garantindo que cada ideia soe autenticamente sua.
              </FeatureCard>
              <FeatureCard icon={<Zap className="w-6 h-6" />} title="Inteligência Viral Sob Demanda">
                Utiliza modelos como GPT-4 para analisar tendências e padrões, gerando conteúdo com base no que comprovadamente funciona agora.
              </FeatureCard>
              <FeatureCard icon={<TrendingUp className="w-6 h-6" />} title="Formatos Otimizados">
                Receba ideias prontas para TikTok/Reels (roteiros curtos), YouTube (estruturas de vídeo) e posts de carrossel para Instagram.
              </FeatureCard>
              <FeatureCard icon={<BarChart2 className="w-6 h-6" />} title="Analytics de Conteúdo">
                (Plano Pro) Conecte suas redes e veja quais ideias geradas pela NEURA tiveram o melhor desempenho. Dobre a aposta no que funciona.
              </FeatureCard>
              <FeatureCard icon={<Users className="w-6 h-6" />} title="Gestão para Equipes e Agências">
                (Plano Enterprise) Crie múltiplos perfis de marcas, convide membros da equipe e gerencie todo o fluxo de conteúdo em um só lugar.
              </FeatureCard>
              <FeatureCard icon={<ShieldCheck className="w-6 h-6" />} title="Segurança Enterprise-Grade">
                Sua estratégia de conteúdo é um ativo valioso. Protegemos seus dados com o mais alto nível de segurança e privacidade.
              </FeatureCard>
            </div>
          </div>
        </section>
        
        {/* Testimonials */}
        <section className="py-20 px-4 bg-white" id="testimonials">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900">Não acredite apenas na nossa palavra</h2>
              <p className="text-lg text-gray-600 mt-4">Veja como criadores e agências estão transformando seus resultados.</p>
            </div>
            <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
              {testimonials.map(t => <TestimonialCard key={t.name} {...t} />)}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 px-4 bg-gray-50" id="pricing">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900">Escolha o plano perfeito para você</h2>
              <p className="text-lg text-gray-600 mt-4">Comece de graça e evolua conforme seu canal cresce. Cancele quando quiser.</p>
              <div className="mt-8 flex justify-center items-center gap-4">
                <span className={billingCycle === 'monthly' ? 'font-semibold text-purple-700' : 'text-gray-500'}>Mensal</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" onChange={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')} />
                  <div className="w-14 h-8 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
                <span className={billingCycle === 'yearly' ? 'font-semibold text-purple-700' : 'text-gray-500'}>
                  Anual <span className="text-sm bg-green-100 text-green-700 font-bold py-1 px-2 rounded-full">Economize 2 meses!</span>
                </span>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8 items-stretch">
              {pricingPlans[billingCycle].map(plan => (
                <div key={plan.name} className={`p-8 rounded-2xl border flex flex-col ${plan.popular ? 'border-purple-600 border-2 relative bg-white shadow-2xl' : 'border-gray-200 bg-white/50'}`}>
                  {plan.popular && <div className="absolute top-0 -translate-y-1/2 bg-purple-600 text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg">MAIS POPULAR</div>}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline mb-6">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    <span className="text-gray-500 ml-1">/mês</span>
                  </div>
                  <ul className="space-y-4 mb-8 flex-grow">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={plan.href} className={`w-full text-center font-bold py-3 px-6 rounded-lg transition-all duration-300 hover:scale-105 ${plan.popular ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4 bg-white" id="faq">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900">Perguntas Frequentes</h2>
              <p className="text-lg text-gray-600 mt-4">Tudo o que você precisa saber antes de começar.</p>
            </div>
            <FaqItem
              question="Como a IA da NEURA funciona?"
              answer="Nossa plataforma utiliza modelos de linguagem avançados (como o GPT-4) que são alimentados com dados do seu 'Perfil NEURA'. Nós criamos um 'prompt' complexo que instrui a IA a agir como uma estrategista de conteúdo para o seu nicho específico, garantindo resultados relevantes e criativos."
            />
            <FaqItem
              question="Posso cancelar minha assinatura a qualquer momento?"
              answer="Sim! Você tem total controle sobre sua assinatura. Pode cancelar a qualquer momento, sem taxas ou burocracia, diretamente no seu painel de controle. O plano Free é gratuito para sempre."
            />
            <FaqItem
              question="Meus dados e ideias estão seguros?"
              answer="Absolutamente. A segurança é nossa prioridade máxima. Todas as suas informações, perfis e ideias geradas são criptografadas e armazenadas de forma segura. Nunca compartilhamos seus dados com terceiros."
            />
             <FaqItem
              question="Para quem a NEURA é mais indicada?"
              answer="A NEURA é ideal para criadores de conteúdo digital (TikTokers, YouTubers, Instagrammers), freelancers, social media managers, agências de marketing e qualquer pessoa ou empresa que queira otimizar e escalar sua produção de conteúdo com inteligência e estratégia."
            />
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto text-center bg-purple-600 text-white p-12 rounded-2xl shadow-2xl bg-gradient-to-br from-purple-600 to-purple-800">
            <h2 className="text-4xl font-bold mb-4">Pronto para se tornar uma potência de conteúdo?</h2>
            <p className="text-purple-200 text-lg mb-8">
              Junte-se a milhares de criadores que estão economizando tempo, superando o bloqueio criativo e crescendo de forma previsível.
            </p>
            <Link to="/register" className="bg-white hover:bg-gray-200 text-purple-600 font-bold py-4 px-10 rounded-lg text-lg transition-all duration-300 hover:scale-105 shadow-lg">
              Começar a Criar (Grátis)
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
                <Sparkles className="w-8 h-8 text-purple-400" />
                <span className="text-2xl font-bold text-white">NEURA</span>
            </div>
            <div className="flex justify-center gap-6 mb-8">
                <Link to="/termos" className="hover:text-white">Termos de Serviço</Link>
                <Link to="/privacidade" className="hover:text-white">Política de Privacidade</Link>
                <Link to="/contato" className="hover:text-white">Contato</Link>
            </div>
          <p className="text-gray-500">&copy; {new Date().getFullYear()} NEURA. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}