import { ShoppingBag, Users, DollarSign, Package } from 'lucide-react';

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  out_for_delivery: 'Saiu p/ entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  preparing: 'bg-orange-500/20 text-orange-400',
  out_for_delivery: 'bg-purple-500/20 text-purple-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

export const STAT_CARDS = [
  {
    title: 'Total de Pedidos',
    dataKey: 'orders_count',
    icon: ShoppingBag,
  },
  {
    title: 'Total de Clientes',
    dataKey: 'clients_count',
    icon: Users,
  },
  {
    title: 'Receita Total',
    dataKey: 'total_revenue',
    icon: DollarSign,
  },
  {
    title: 'Total de Produtos',
    dataKey: 'products_count',
    icon: Package,
  },
];
