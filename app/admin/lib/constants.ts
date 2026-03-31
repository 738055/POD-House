import { ShoppingBag, Users, DollarSign, Package } from 'lucide-react';

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
