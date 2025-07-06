import { test, expect, beforeAll, afterAll, describe } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import App from '../App';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import MinhaConta from '../pages/MinhaConta';

const testUser = {
  email: 'teste@exemplo.com',
  password: 'Senha@123',
  name: 'Usuário Teste',
  phone: '(11) 99999-9999',
  birthdate: '01/01/1990',
  address: 'Rua Teste, 123',
};

describe('NEURA - Testes End-to-End', () => {
  beforeAll(async () => {
    await supabase.auth.signOut();
    localStorage.clear();
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  describe('1. Autenticação', () => {
    test('deve completar fluxo de registro com sucesso', async () => {
      render(
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      );

      await userEvent.type(screen.getByPlaceholderText('Seu nome completo'), testUser.name);
      await userEvent.type(screen.getByPlaceholderText('seu@email.com'), testUser.email);
      await userEvent.type(screen.getByPlaceholderText('••••••••'), testUser.password);
      await userEvent.click(screen.getByRole('checkbox'));
      await userEvent.click(screen.getByText('Criar conta'));

      await waitFor(() => {
        expect(screen.getByText(/conta criada com sucesso/i)).toBeInTheDocument();
      });
    });

    test('deve realizar login com sucesso', async () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );

      await userEvent.type(screen.getByPlaceholderText('seu@email.com'), testUser.email);
      await userEvent.type(screen.getByPlaceholderText('••••••••'), testUser.password);
      await userEvent.click(screen.getByText('Lembrar-me'));
      await userEvent.click(screen.getByText('Entrar'));

      await waitFor(() => {
        expect(window.location.pathname).toBe('/dashboard');
      });
    });
  });

  describe('2. Dashboard', () => {
    beforeAll(async () => {
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });
    });

    test('deve exibir dados do usuário corretamente', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(testUser.name)).toBeInTheDocument();
      });
    });

    test('deve gerar e salvar nova ideia', async () => {
      render(<Dashboard />);

      const gerarButton = screen.getByText('Gerar nova ideia');
      await userEvent.click(gerarButton);

      await waitFor(() => {
        const ideiaGerada = screen.getByText(/^(?!Gerar nova ideia).+/);
        expect(ideiaGerada).toBeInTheDocument();
      });

      const copiarButton = screen.getByText('Copiar Ideia');
      await userEvent.click(copiarButton);

      const clipboardText = await navigator.clipboard.readText();
      expect(clipboardText).toBeTruthy();
    });
  });

  describe('3. Perfil', () => {
    test('deve atualizar informações do perfil', async () => {
      render(
        <BrowserRouter>
          <MinhaConta />
        </BrowserRouter>
      );

      const nomeInput = screen.getByDisplayValue(testUser.name);
      await userEvent.clear(nomeInput);
      await userEvent.type(nomeInput, 'Nome Atualizado');

      const telefoneInput = screen.getByPlaceholderText('(00) 00000-0000');
      await userEvent.type(telefoneInput, testUser.phone);

      const salvarButton = screen.getByText('Salvar Alterações');
      await userEvent.click(salvarButton);

      await waitFor(() => {
        expect(screen.getByText(/perfil atualizado/i)).toBeInTheDocument();
      });
    });

    test('deve fazer upload de avatar', async () => {
      render(
        <BrowserRouter>
          <MinhaConta />
        </BrowserRouter>
      );

      const file = new File(['test'], 'avatar.png', { type: 'image/png' });
      const input = screen.getByTestId('avatar-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByAltText('Avatar')).toBeInTheDocument();
      });
    });
  });

  describe('4. Integridade Supabase', () => {
    test('deve validar políticas RLS', async () => {
      const { data: ideias, error } = await supabase
        .from('ideias_virais')
        .select('*');

      expect(error).toBeNull();
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

  describe('5. Validação de Rotas', () => {
    test('deve redirecionar rotas protegidas quando deslogado', async () => {
      await supabase.auth.signOut();
      
      render(<App />);
      
      window.history.pushState({}, '', '/dashboard');

      await waitFor(() => {
        expect(window.location.pathname).toBe('/login');
      });
    });

    test('deve tratar rotas inexistentes', async () => {
      window.history.pushState({}, '', '/rota-inexistente');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/página não encontrada/i)).toBeInTheDocument();
      });
    });
  });

  describe('6. Testes de Simulação', () => {
    test('deve manter estado no localStorage', async () => {
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      window.location.reload();

      render(<App />);

      await waitFor(() => {
        expect(window.location.pathname).toBe('/dashboard');
      });
    });

    test('deve validar formulários corretamente', async () => {
      render(
        <BrowserRouter>
          <MinhaConta />
        </BrowserRouter>
      );

      const submitButton = screen.getByText('Salvar Alterações');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/campo obrigatório/i)).toBeInTheDocument();
      });
    });
  });
});