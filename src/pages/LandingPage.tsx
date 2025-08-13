import React, { useState, useEffect } from 'react';
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
  Quote,
  Play,
  Pause
} from 'lucide-react';
import NeuralNetworkBackground from '../components/NeuralNetworkBackground'; // MUDANÇA 1: Importando o novo componente

// Custom cursor component
const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    document.addEventListener('mousemove', updatePosition);
    
    // Add hover listeners to interactive elements
    const interactiveElements = document.querySelectorAll('button, a, [role="button"]');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      document.removeEventListener('mousemove', updatePosition);
      interactiveElements.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  return (
    <div 
      className="fixed pointer-events-none z-50 mix-blend-difference"
      style={{
        left: position.x - 10,
        top: position.y - 10,
        transform: `scale(${isHovering ? 1.5 : 1})`,
        transition: 'transform 0.2s ease'
      }}
    >
      <div className="w-5 h-5 bg-white rounded-full opacity-80" />
    </div>
  );
};

// Glowing button component
const GlowButton = ({ children, className = '', variant = 'primary', ...props }: any) => {
  const baseClasses = "relative px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 overflow-hidden group";
  
  const variants = {
    primary: "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-purple-500/25 hover:shadow-2xl",
    secondary: "bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 hover:shadow-white/10 hover:shadow-xl"
  };

  return (
    <button className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/20 to-purple-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
    </button>
  );
};

// 3D Mockup component with hover animations
const MockupDisplay = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="relative max-w-4xl mx-auto mt-20">
      {/* Glassmorphism container */}
      <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 mb-6 p-4 bg-black/20 rounded-t-xl">
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse delay-100" />
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse delay-200" />
          </div>
          <div className="flex-1 bg-black/30 rounded-lg px-4 py-2 ml-4">
            <span className="text-white/60 text-sm">neura.app</span>
          </div>
        </div>

        {/* Mockup content with 3D effect */}
        <div className="relative transform-gpu perspective-1000">
          <div className="grid grid-cols-12 gap-6 h-96 transform hover:rotateY-2 hover:rotateX-1 transition-transform duration-500">
            {/* Sidebar */}
            <div className="col-span-3 bg-gradient-to-b from-purple-900/30 to-blue-900/30 rounded-xl p-4 backdrop-blur-sm border border-purple-500/20">
              <div className="space-y-3">
                <div className="h-8 bg-purple-500/40 rounded-lg animate-pulse" />
                <div className="h-4 bg-white/20 rounded w-4/5 animate-pulse delay-100" />
                <div className="h-4 bg-white/20 rounded w-3/5 animate-pulse delay-200" />
                <div className="h-4 bg-white/20 rounded w-5/6 animate-pulse delay-300" />
              </div>
            </div>

            {/* Main content */}
            <div className="col-span-9 space-y-4">
              {/* Header */}
              <div className="h-12 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl backdrop-blur-sm border border-purple-500/20 animate-pulse" />
              
              {/* AI Generation card */}
              <div className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-xl p-6 backdrop-blur-sm border border-purple-500/20 hover:border-purple-400/40 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-6 h-6 text-purple-400 animate-spin-slow" />
                  <div className="h-6 bg-purple-400/30 rounded w-48 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-white/20 rounded w-full animate-pulse" />
                  <div className="h-4 bg-white/20 rounded w-4/5 animate-pulse delay-100" />
                  <div className="h-4 bg-white/20 rounded w-3/5 animate-pulse delay-200" />
                </div>
              </div>

              {/* Analytics preview */}
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-6 backdrop-blur-sm border border-blue-500/20 hover:border-blue-400/40 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart2 className="w-6 h-6 text-blue-400" />
                  <div className="h-6 bg-blue-400/30 rounded w-32 animate-pulse" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-16 bg-gradient-to-t from-purple-500/30 to-purple-500/10 rounded animate-pulse" />
                  <div className="h-20 bg-gradient-to-t from-blue-500/30 to-blue-500/10 rounded animate-pulse delay-100" />
                  <div className="h-12 bg-gradient-to-t from-cyan-500/30 to-cyan-500/10 rounded animate-pulse delay-200" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-110"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* Glow effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-transparent to-blue-500/20 rounded-2xl blur-xl -z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 via-transparent to-cyan-500/10 rounded-2xl blur-2xl -z-20" />
    </div>
  );
};

// Feature card component with glassmorphism
const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <div className="group relative bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all duration-500 hover:transform hover:scale-105">
    <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
      <div className="text-purple-400 group-hover:text-purple-300 transition-colors duration-300">
        {icon}
      </div>
    </div>
    <h3 className="text-xl font-bold text-white mb-4 group-hover:text-purple-300 transition-colors duration-300">
      {title}
    </h3>
    <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
      {children}
    </p>
    
    {/* Hover glow effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-blue-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
  </div>
);

// Testimonial card with enhanced styling
const TestimonialCard = ({ name, handle, image, metric, children }: { name: string, handle: string, image: string, metric: string, children: React.ReactNode }) => (
  <div className="group relative bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all duration-500 hover:transform hover:scale-105">
    <Quote className="w-12 h-12 text-purple-400/50 mb-6 group-hover:text-purple-300/70 transition-colors duration-300" />
    <p className="text-gray-300 italic mb-8 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
      "{children}"
    </p>
    <div className="flex items-center gap-4 mb-6">
      <img 
        className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/30 group-hover:border-purple-400/50 transition-colors duration-300" 
        src={image} 
        alt={name} 
      />
      <div>
        <p className="font-bold text-white group-hover:text-purple-300 transition-colors duration-300">{name}</p>
        <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{handle}</p>
      </div>
    </div>
    <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm text-white font-semibold text-center py-3 px-6 rounded-xl border border-purple-500/30">
      {metric}
    </div>
    
    {/* Hover glow effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-blue-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
  </div>
);

// FAQ item with smooth animations
const FaqItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-white/10 py-6">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex justify-between items-center text-left gap-4 group"
      >
        <span className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors duration-300">
          {question}
        </span>
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-purple-500/20 rounded-full border border-purple-500/30 group-hover:bg-purple-500/30 transition-all duration-300">
          <ArrowRight className={`w-5 h-5 text-purple-400 transition-transform duration-300 ${isOpen ? 'transform rotate-90' : ''}`} />
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-500 ${isOpen ? 'max-h-96 mt-6' : 'max-h-0'}`}>
        <p className="text-gray-300 leading-relaxed pr-14">{answer}</p>
      </div>
    </div>
  );
};

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
    { name: 'Julia Alves', handle: '@juliacriativa', image: `https://images.unsplash.com/photo-1494790108755-2616b9e0e4d4?w=150&h=150&fit=crop&crop=face`, metric: '+2 Milhões de views no TikTok', children: 'A NEURA acabou com meu bloqueio criativo. Todo dia tenho ideias frescas e alinhadas com o que meu público ama. É minha arma secreta!' },
    { name: 'Marcos Lacerda', handle: 'Agência MKT Boost', image: `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`, metric: 'Economizo 10h/semana por cliente', children: 'Gerenciamos 15 contas. A NEURA otimizou nosso processo de ideação de uma forma que planilhas e reuniões jamais conseguiriam. Essencial.' },
    { name: 'Beatriz Costa', handle: '@BeaFit', image: `https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face`, metric: '+300% de engajamento', children: 'Meu canal sobre vida saudável decolou! A IA entende meu nicho e sugere pautas que geram comentários e compartilhamentos como nunca.' },
  ];

  return (
    <div className="bg-[#0A0A0A] text-white antialiased overflow-x-hidden">
      <CustomCursor />
      {/* MUDANÇA 2: Componente antigo de formas geométricas foi removido daqui */}
      <NeuralNetworkBackground />
      
      {/* Header */}
      <header className="relative z-10 sticky top-0 bg-black/20 backdrop-blur-xl border-b border-white/5">
        <nav className="max-w-7xl mx-auto flex justify-between items-center p-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Sparkles className="w-10 h-10 text-purple-400 group-hover:text-purple-300 transition-colors duration-300" />
              <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-lg group-hover:bg-purple-300/30 transition-colors duration-300" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              NEURA
            </span>
          </Link>
          
          <div className="hidden md:flex gap-8 items-center">
            <a href="#features" className="font-medium text-gray-300 hover:text-purple-400 transition-colors duration-300">Funcionalidades</a>
            <a href="#pricing" className="font-medium text-gray-300 hover:text-purple-400 transition-colors duration-300">Preços</a>
            <a href="#testimonials" className="font-medium text-gray-300 hover:text-purple-400 transition-colors duration-300">Depoimentos</a>
            <a href="#faq" className="font-medium text-gray-300 hover:text-purple-400 transition-colors duration-300">FAQ</a>
          </div>
          
          <div className="flex gap-4 items-center">
            <Link to="/login" className="px-6 py-3 text-gray-300 font-semibold hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300">
              Entrar
            </Link>
            <Link to="/register">
              <GlowButton>
                Começar Grátis <ArrowRight className="w-5 h-5" />
              </GlowButton>
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center">
          {/* MUDANÇA 3: Fundo gradiente mais sutil para complementar a animação 3D */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/80 to-[#0A0A0A]" />
          
          <div className="relative z-10 py-32 px-6 text-center max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-5xl md:text-7xl font-extrabold mb-8 leading-tight">
                Sua Fábrica de{' '}
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient-x">
                  Conteúdo Viral
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Dê adeus ao bloqueio criativo. A NEURA é sua co-piloto de IA que gera ideias, roteiros e legendas com alto potencial de viralização, personalizadas para sua marca.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link to="/register">
                  <GlowButton className="text-lg px-12 py-5">
                    Receber minhas primeiras ideias virais (Grátis)
                  </GlowButton>
                </Link>
                <GlowButton variant="secondary" className="text-lg px-8 py-5">
                  <Play className="w-6 h-6" />
                  Ver Demo
                </GlowButton>
              </div>
            </div>

            <MockupDisplay />
          </div>
        </section>

        {/* How it Works */}
        <section className="py-32 px-6 relative" id="features">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Como a Mágica Acontece em 3 Passos
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Transforme sua estratégia de conteúdo em minutos.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12 relative">
              {/* Connection lines */}
              <div className="hidden md:block absolute top-16 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
              
              <div className="relative text-center group">
                <div className="flex items-center justify-center w-32 h-32 bg-gradient-to-br from-purple-600 to-blue-600 text-white text-5xl font-bold rounded-full mx-auto mb-8 border-4 border-white/10 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  1
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-purple-300 transition-colors duration-300">
                  Configure seu Perfil
                </h3>
                <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                  Informe seu nicho, tom de voz, e objetivos. A IA aprende quem você é.
                </p>
              </div>
              
              <div className="relative text-center group">
                <div className="flex items-center justify-center w-32 h-32 bg-gradient-to-br from-purple-600 to-blue-600 text-white text-5xl font-bold rounded-full mx-auto mb-8 border-4 border-white/10 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  2
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-purple-300 transition-colors duration-300">
                  Gere Ideias Sob Demanda
                </h3>
                <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                  Peça ideias de vídeos, roteiros ou posts. Receba dezenas de opções em segundos.
                </p>
              </div>
              
              <div className="relative text-center group">
                <div className="flex items-center justify-center w-32 h-32 bg-gradient-to-br from-purple-600 to-blue-600 text-white text-5xl font-bold rounded-full mx-auto mb-8 border-4 border-white/10 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  3
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-purple-300 transition-colors duration-300">
                  Crie, Analise e Otimize
                </h3>
                <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                  Use nosso Analytics para ver o que funciona e refinar sua estratégia continuamente.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Features */}
        <section className="py-32 px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Mais que um gerador de ideias, uma plataforma de crescimento
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Ferramentas poderosas para cada etapa do seu processo criativo.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard icon={<Brain className="w-8 h-8" />} title="Perfil NEURA Inteligente">
                Sua marca tem uma personalidade. Nossa IA aprende e se adapta a ela, garantindo que cada ideia soe autenticamente sua.
              </FeatureCard>
              <FeatureCard icon={<Zap className="w-8 h-8" />} title="Inteligência Viral Sob Demanda">
                Utiliza modelos como Gemini para analisar tendências e padrões, gerando conteúdo com base no que comprovadamente funciona agora.
              </FeatureCard>
              <FeatureCard icon={<TrendingUp className="w-8 h-8" />} title="Formatos Otimizados">
                Receba ideias prontas para TikTok/Reels (roteiros curtos), YouTube (estruturas de vídeo) e posts de carrossel para Instagram.
              </FeatureCard>
              <FeatureCard icon={<BarChart2 className="w-8 h-8" />} title="Analytics de Conteúdo">
                (Plano Pro) Conecte suas redes e veja quais ideias geradas pela NEURA tiveram o melhor desempenho. Dobre a aposta no que funciona.
              </FeatureCard>
              <FeatureCard icon={<Users className="w-8 h-8" />} title="Gestão para Equipes e Agências">
                (Plano Enterprise) Crie múltiplos perfis de marcas, convide membros da equipe e gerencie todo o fluxo de conteúdo em um só lugar.
              </FeatureCard>
              <FeatureCard icon={<ShieldCheck className="w-8 h-8" />} title="Segurança Enterprise-Grade">
                Sua estratégia de conteúdo é um ativo valioso. Protegemos seus dados com o mais alto nível de segurança e privacidade.
              </FeatureCard>
            </div>
          </div>
        </section>
        
        {/* Testimonials */}
        <section className="py-32 px-6 relative" id="testimonials">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Não acredite apenas na nossa palavra
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Veja como criadores e agências estão transformando seus resultados.
              </p>
            </div>
            
            <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
              {testimonials.map(t => <TestimonialCard key={t.name} {...t} />)}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-32 px-6 relative" id="pricing">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Escolha o plano perfeito para você
              </h2>
              <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
                Comece de graça e evolua conforme seu canal cresce. Cancele quando quiser.
              </p>
              
              <div className="flex justify-center items-center gap-6 mb-16">
                <span className={`text-lg ${billingCycle === 'monthly' ? 'font-bold text-purple-400' : 'text-gray-400'}`}>
                  Mensal
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    onChange={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')} 
                  />
                  <div className="w-16 h-8 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-blue-600"></div>
                </label>
                <span className={`text-lg ${billingCycle === 'yearly' ? 'font-bold text-purple-400' : 'text-gray-400'}`}>
                  Anual 
                  <span className="ml-2 text-sm bg-gradient-to-r from-green-400 to-green-600 text-black font-bold py-1 px-3 rounded-full">
                    Economize 2 meses!
                  </span>
                </span>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8">
              {pricingPlans[billingCycle].map(plan => (
                <div key={plan.name} className={`relative p-8 rounded-2xl border flex flex-col ${
                  plan.popular 
                    ? 'border-purple-500 bg-gradient-to-b from-purple-500/10 to-blue-500/10 backdrop-blur-xl shadow-2xl transform scale-105' 
                    : 'border-white/10 bg-white/5 backdrop-blur-xl'
                }`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg">
                      MAIS POPULAR
                    </div>
                  )}
                  
                  <h3 className="text-2xl font-bold mb-4 text-white">{plan.name}</h3>
                  <div className="flex items-baseline mb-8">
                    <span className="text-5xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-gray-400 ml-2">/mês</span>
                  </div>
                  
                  <ul className="space-y-4 mb-12 flex-grow">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link to={plan.href}>
                    <GlowButton 
                      variant={plan.popular ? 'primary' : 'secondary'} 
                      className="w-full justify-center"
                    >
                      {plan.cta}
                    </GlowButton>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-32 px-6 relative" id="faq">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Perguntas Frequentes
              </h2>
              <p className="text-xl text-gray-300">
                Tudo o que você precisa saber antes de começar.
              </p>
            </div>
            
            <div className="space-y-2">
              <FaqItem
                question="Como a IA da NEURA funciona?"
                answer="Nossa plataforma utiliza modelos de linguagem avançados (como o Google Gemini) que são alimentados com dados do seu 'Perfil NEURA'. Nós criamos um 'prompt' complexo que instrui a IA a agir como uma estrategista de conteúdo para o seu nicho específico, garantindo resultados relevantes e criativos."
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
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="relative bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-xl p-16 rounded-3xl border border-purple-500/30 shadow-2xl">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Pronto para se tornar uma potência de conteúdo?
              </h2>
              <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
                Junte-se a milhares de criadores que estão economizando tempo, superando o bloqueio criativo e crescendo de forma previsível.
              </p>
              <Link to="/register">
                <GlowButton className="text-xl px-12 py-6">
                  Começar a Criar (Grátis)
                </GlowButton>
              </Link>
              
              {/* Background glow effects */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 rounded-3xl blur-xl -z-10" />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-black/40 backdrop-blur-xl border-t border-white/5 py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="relative">
              <Sparkles className="w-10 h-10 text-purple-400" />
              <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-lg" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              NEURA
            </span>
          </div>
          
          <div className="flex justify-center gap-8 mb-12 text-gray-400">
            <Link to="/termos" className="hover:text-purple-400 transition-colors duration-300">Termos de Serviço</Link>
            <Link to="/privacidade" className="hover:text-purple-400 transition-colors duration-300">Política de Privacidade</Link>
            <Link to="/contato" className="hover:text-purple-400 transition-colors duration-300">Contato</Link>
          </div>
          
          <p className="text-gray-500">
            &copy; {new Date().getFullYear()} NEURA. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
