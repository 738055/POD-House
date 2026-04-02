'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MapPin, User, Phone, CreditCard } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';

const checkoutSchema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('E-mail inválido'),
  cep: z.string().min(8, 'CEP inválido'),
  logradouro: z.string().min(5, 'Endereço muito curto'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(3, 'Bairro obrigatório'),
  city: z.string().min(3, 'Cidade obrigatória'),
  uf: z.string().length(2, 'UF inválida'),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  total: number;
}

export default function Checkout({ isOpen, onClose, items, total }: CheckoutProps) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors }, watch } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });

  const handleCEPBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      setLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setValue('logradouro', data.logradouro);
          setValue('neighborhood', data.bairro);
          setValue('city', data.localidade);
          setValue('uf', data.uf);
        }
      } catch (error) {
        console.error('Error fetching CEP:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    setLoading(true);
    
    // Cadastro silencioso
    try {
      const supabase = createClient();
      await supabase.auth.signUp({
        email: data.email,
        password: Math.random().toString(36).slice(-10) + 'Aa1@', // Senha forte
        options: { 
          data: { full_name: data.name, phone: data.phone.replace(/\D/g, '') } 
        }
      });
    } catch (e) {
      console.error('Falha no cadastro silencioso', e);
    }

    const message = `*NOVO PEDIDO!* 🍔\n\n` +
      `*Cliente:* ${data.name}\n` +
      `*Telefone:* ${data.phone}\n\n` +
      `*Endereço de Entrega:*\n` +
      `${data.logradouro}, ${data.number}${data.complement ? ` - ${data.complement}` : ''}\n` +
      `${data.neighborhood} - ${data.city}/${data.uf}\n` +
      `CEP: ${data.cep}\n\n` +
      `*Itens do Pedido:*\n` +
      items.map(item => `${item.quantity}x ${item.name} (${item.variationName}) - R$ ${(item.price * item.quantity).toFixed(2)}`).join('\n') +
      `\n\n*Resumo:* \n` +
      `Subtotal: R$ ${total.toFixed(2)}\n` +
      `*Total a Pagar: R$ ${total.toFixed(2)}*\n\n` +
      `*Pagamento:* A combinar no chat.\n\n` +
      `_Enviado via House Delivery_`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=5511999999999&text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-x-0 bottom-0 top-10 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl bg-surface z-50 shadow-2xl rounded-t-[40px] md:rounded-[40px] flex flex-col overflow-hidden border-t md:border border-border"
          >
            <div className="p-6 border-b border-border flex items-center justify-between bg-surface sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <CreditCard size={20} />
                </div>
                <h2 className="font-display text-2xl uppercase tracking-tight text-white">Finalizar Pedido</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors text-gray-400">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex-grow overflow-y-auto p-6 space-y-10 no-scrollbar">
              <section className="space-y-6">
                <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em]">
                  <User size={14} />
                  Dados Pessoais
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input 
                      {...register('name')}
                      className="w-full p-4 bg-background rounded-2xl border border-border focus:border-primary outline-none transition-all text-sm font-bold text-white placeholder:text-gray-700"
                      placeholder="Ex: João Silva"
                    />
                    {errors.name && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input 
                      {...register('phone')}
                      className="w-full p-4 bg-background rounded-2xl border border-border focus:border-primary outline-none transition-all text-sm font-bold text-white placeholder:text-gray-700"
                      placeholder="(11) 99999-9999"
                    />
                    {errors.phone && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.phone.message}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">E-mail</label>
                    <input 
                      type="email"
                      {...register('email')}
                      className="w-full p-4 bg-background rounded-2xl border border-border focus:border-primary outline-none transition-all text-sm font-bold text-white placeholder:text-gray-700"
                      placeholder="seu@email.com"
                    />
                    {errors.email && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.email.message}</p>}
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.2em]">
                  <MapPin size={14} />
                  Endereço de Entrega
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">CEP</label>
                    <input 
                      {...register('cep')}
                      onBlur={handleCEPBlur}
                      className="w-full p-4 bg-background rounded-2xl border border-border focus:border-primary outline-none transition-all text-sm font-bold text-white placeholder:text-gray-700"
                      placeholder="00000-000"
                    />
                    {errors.cep && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.cep.message}</p>}
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Rua / Logradouro</label>
                    <input 
                      {...register('logradouro')}
                      className="w-full p-4 bg-background rounded-2xl border border-border focus:border-primary outline-none transition-all text-sm font-bold text-white placeholder:text-gray-700"
                      placeholder="Ex: Rua das Flores"
                    />
                    {errors.logradouro && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.logradouro.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Número</label>
                    <input 
                      {...register('number')}
                      className="w-full p-4 bg-background rounded-2xl border border-border focus:border-primary outline-none transition-all text-sm font-bold text-white placeholder:text-gray-700"
                      placeholder="123"
                    />
                    {errors.number && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.number.message}</p>}
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Complemento</label>
                    <input 
                      {...register('complement')}
                      className="w-full p-4 bg-background rounded-2xl border border-border focus:border-primary outline-none transition-all text-sm font-bold text-white placeholder:text-gray-700"
                      placeholder="Apto, Bloco, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Bairro</label>
                    <input 
                      {...register('neighborhood')}
                      className="w-full p-4 bg-background rounded-2xl border border-border focus:border-primary outline-none transition-all text-sm font-bold text-white placeholder:text-gray-700"
                      placeholder="Centro"
                    />
                    {errors.neighborhood && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.neighborhood.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cidade</label>
                    <input 
                      {...register('city')}
                      className="w-full p-4 bg-background rounded-2xl border border-border focus:border-primary outline-none transition-all text-sm font-bold text-white placeholder:text-gray-700"
                      placeholder="São Paulo"
                    />
                    {errors.city && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.city.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">UF</label>
                    <input 
                      {...register('uf')}
                      className="w-full p-4 bg-background rounded-2xl border border-border focus:border-primary outline-none transition-all text-sm font-bold text-white placeholder:text-gray-700"
                      placeholder="SP"
                    />
                    {errors.uf && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.uf.message}</p>}
                  </div>
                </div>
              </section>

              <div className="p-8 bg-background/50 rounded-[32px] border border-border space-y-6">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total do Pedido</p>
                    <p className="text-4xl font-display text-primary tracking-tighter">R$ {total.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Cashback Estimado</p>
                    <p className="text-lg font-black text-secondary leading-none">R$ {(total * 0.05).toFixed(2)}</p>
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full btn-primary py-5 text-xs uppercase tracking-[0.2em] font-black flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,215,0,0.2)] active:scale-95 transition-transform"
                >
                  {loading ? <span className="animate-spin text-xl">↻</span> : <Send size={18} />}
                  {loading ? 'Processando...' : 'Enviar Pedido pelo WhatsApp'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
