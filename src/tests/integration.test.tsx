import { test, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import App from '../App';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import MinhaConta from '../pages/MinhaConta';

const testUser = {
  email: 'test@example.com',
  password: 'Test@123!',
  name: 'Test User',
};

const mockIdeia = {
  conteudo: 'Ideia de teste para integração',
  created_at: new Date().toISOString(),
};

describe('NEURA Integration Tests', () => {
  beforeAll(async () => {
    await supabase.auth.signOut();
    localStorage.clear();
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  describe('1. Autenticação e Registro', () => {
    test('deve realizar login com sucesso', async () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );

      const emailInput = screen.getByPlaceholderText('seu@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitButton = screen.getByText('Entrar');

      fireEvent.change(emailInput, { target: { value: testUser.email } });
      fireEvent.change(passwordInput, { target: { value: testUser.password } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(window.location.pathname).toBe('/dashboard');
      });
    });

    test('deve criar nova conta com sucesso', async () => {
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );

      const nameInput = screen.getByPlaceholderText('Seu nome completo');
      const emailInput = screen.getByPlaceholderText('seu@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByText('Criar conta');

      fireEvent.change(nameInput, { target: { value: testUser.name } });
      fireEvent.change(emailInput, { target: { value: testUser.email } });
      fireEvent.change(passwordInput, { target: { value: testUser.password } });
      fireEvent.click(termsCheckbox);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Conta criada com sucesso!')).toBeInTheDocument();
      });
    });
  });

  describe('2. Dashboard Principal', () => {
    beforeAll(async () => {
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });
    });

    test('deve carregar dados do usuário no dashboard', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(testUser.name)).toBeInTheDocument();
      });
    });

    test('deve gerar e salvar nova ideia', async () => {
      render(<Dashboard />);

      const gerarButton = screen.getByText('Gerar nova ideia');
      fireEvent.click(gerarButton);

      await waitFor(() => {
        expect(screen.getByText(/^[^Gerar].*$/)).toBeInTheDocument();
      });
    });
  });

  describe('3. Gerenciamento de Perfil', () => {
    test('deve atualizar dados do perfil', async () => {
      render(
        <BrowserRouter>
          <MinhaConta />
        </BrowserRouter>
      );

      const nomeInput = screen.getByDisplayValue(testUser.name);
      const novoNome = 'Nome Atualizado';
      
      fireEvent.change(nomeInput, { target: { value: novoNome } });
      
      const salvarButton = screen.getByText('Salvar Alterações');
      fireEvent.click(salvarButton);

      await waitFor(() => {
        expect(screen.getByText('Perfil atualizado com sucesso!')).toBeInTheDocument();
      });
    });

    test('deve fazer upload de avatar', async () => {
      render(
        <BrowserRouter>
          <MinhaConta />
        </BrowserRouter>
      );

      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const input = screen.getByTestId('avatar-input');

      Object.defineProperty(input, 'files', {
        value: [file],
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByAltText('Avatar')).toBeInTheDocument();
      });
    });
  });

  describe('4. Integridade do Supabase', () => {
    test('deve validar políticas RLS', async () => {
      const { data: ideias, error } = await supabase
        .from('ideias_virais')
        .select('*');

      expect(error).toBeNull();
      expect(ideias).toBeDefined();
      expect(Array.isArray(ideias)).toBe(true);
    });

    test('deve verificar isolamento de dados', async () => {
      const { data: ideias } = await supabase
        .from('ideias_virais')
        .select('*')
        .eq('user_id', supabase.auth.user()?.id);

      ideias?.forEach(ideia => {
        expect(ideia.user_id).toBe(supabase.auth.user()?.id);
      });
    });
  });

  describe('5. Qualidade da Interface', () => {
    test('deve validar navegação entre páginas', async () => {
      render(<App />);

      const perfilLink = screen.getByText('Minha Conta');
      fireEvent.click(perfilLink);

      await waitFor(() => {
        expect(window.location.pathname).toBe('/minha-conta');
      });
    });

    test('deve verificar responsividade', async () => {
      render(<Dashboard />);

      window.innerWidth = 375;
      window.innerHeight = 667;
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        const menuButton = screen.getByRole('button', { name: /menu/i });
        expect(menuButton).toBeInTheDocument();
      });
    });
  });
});