'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const schema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { supabase } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormValues) {
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    if (error) {
      setError('Não foi possível enviar o e-mail. Tente novamente.');
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">E-mail enviado!</h1>
          <p className="text-gray-500 mb-6">
            Verifique sua caixa de entrada e clique no link para redefinir sua senha.
          </p>
          <Link href="/login" className="inline-block bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 transition-colors">
            Voltar para Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Image src="/logo.png" alt="POD House Logo" width={80} height={80} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Esqueceu a senha?</h1>
          <p className="text-gray-500">Informe seu e-mail para receber um link de recuperação</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              id="email"
              type="email"
              {...register('email')}
              placeholder="seu@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors disabled:bg-purple-400"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
            <span>{isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}</span>
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="font-medium text-purple-600 hover:underline flex items-center justify-center gap-1">
            <ArrowLeft size={14} /> Voltar para Login
          </Link>
        </p>
      </div>
    </div>
  );
}
