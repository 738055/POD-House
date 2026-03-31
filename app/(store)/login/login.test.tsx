'use client';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../app/login/page';
import { AuthProvider } from '../hooks/use-auth';
import { SupabaseClient } from '@supabase/supabase-js';

// Mocking useRouter
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
}));

// Mocking useAuth hook
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();

const mockSupabase = {
  auth: {
    signInWithPassword: mockSignIn,
    signOut: mockSignOut,
  },
} as unknown as SupabaseClient;

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    supabase: mockSupabase,
    session: null,
    isAdmin: false,
    loading: false,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the login form', () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/por favor, insira um e-mail válido./i)).toBeInTheDocument();
    expect(await screen.findByText(/a senha deve ter no mínimo 6 caracteres./i)).toBeInTheDocument();
  });

  it('calls supabase.auth.signInWithPassword on submit', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('calls router.refresh on successful login', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('shows an error message on failed login', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials', name: 'AuthApiError', status: 400 } });

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/e-mail ou senha inválidos. tente novamente./i)).toBeInTheDocument();
  });
});
