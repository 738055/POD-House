export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  description?: string;
  puffs?: string;
  inStock: boolean;
}

export interface Category {
  id: string;
  name: string;
  image: string;
  count: number;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  image: string;
  badge?: string;
}

export const categories: Category[] = [
  { id: 'ignite-v15', name: 'IGNITE V15 1.500MIL PUFFS', image: '/cat_ignite_v15.png', count: 8 },
  { id: 'ignite-v55', name: 'IGNITE V55 THIN 5.500 PUFFS', image: '/cat_ignite_v55.png', count: 6 },
  { id: 'ignite-v80', name: 'IGNITE V80 8.000 PUFFS', image: '/cat_ignite_v80.png', count: 5 },
  { id: 'ignite-v155', name: 'IGNITE V155 SLIM 15.500 PUFFS', image: '/cat_ignite_v155.png', count: 7 },
  { id: 'ignite-v250', name: 'IGNITE V250 25.000 PUFFS', image: '/cat_ignite_v250.png', count: 4 },
  { id: 'ignite-v300', name: 'IGNITE V300 30.000 PUFFS', image: '/cat_ignite_v300.png', count: 6 },
  { id: 'ignite-v300ultra', name: 'IGNITE V300 ULTRA SLIM 30,000 PUFFS', image: '/cat_ignite_v300ultra.png', count: 3 },
  { id: 'ignite-v400', name: 'IGNITE V400 40.000 PUFFS', image: '/cat_ignite_v400.png', count: 5 },
  { id: 'ignite-v400mix', name: 'IGNITE V400 MIX 40.000 PUFFS', image: '/product_ignite_v400mix.png', count: 4 },
  { id: 'lifepod-10k', name: 'REFIL LIFE POD 10K 10.000 PUFFS', image: '/product_kit_lifepod.png', count: 8 },
  { id: 'lifepod-8k', name: 'REFIL LIFE POD 8K 8.000 PUFFS', image: '/product_kit_lifepod.png', count: 6 },
  { id: 'kit-lifepod', name: 'KIT LIFE POD 10K', image: '/product_kit_lifepod.png', count: 3 },
  { id: 'lifepod-40k', name: 'LIFE POD 40K 40.000 PUFFS', image: '/product_kit_lifepod.png', count: 4 },
  { id: 'nikbar-10k', name: 'NIKBAR 10K 10.000 PUFFS', image: '/product_elfbar_iceking.png', count: 5 },
  { id: 'elfbar-te30k', name: 'ELFBAR TE 30K 30.000 PUFFS', image: '/product_elfbar_iceking.png', count: 6 },
  { id: 'elfbar-iceking', name: 'ELFBAR ICE KING 40K 40.000 PUFFS', image: '/product_elfbar_iceking.png', count: 4 },
  { id: 'elfbar-bc10k', name: 'ELFBAR BC 10.000 PUFFS', image: '/product_elfbar_iceking.png', count: 7 },
  { id: 'oxbar-30k', name: 'OXBAR 30MIL PUFFS', image: '/product_ignite_v300.png', count: 5 },
  { id: 'oxbar-32k', name: 'OXBAR 32MIL PUFFS', image: '/product_ignite_v300.png', count: 4 },
  { id: 'kit-oxbar', name: 'KIT OXBAR 32MIL PUFFS (BATERIA+REFIL)', image: '/product_ignite_v300.png', count: 3 },
  { id: 'blacksheep-30k-ice', name: 'BLACK SHEEP 30K ICE MASTER', image: '/product_ignite_v400mix.png', count: 5 },
  { id: 'blacksheep-30k-dual', name: 'BLACK SHEEP 30K DUAL TANK', image: '/product_ignite_v400mix.png', count: 4 },
  { id: 'blacksheep-40k-dual', name: 'BLACK SHEEP 40K DUAL TANK', image: '/product_ignite_v400mix.png', count: 3 },
  { id: 'blacksheep-40k-ice', name: 'BLACK SHEEP 40K ICE MASTER', image: '/product_ignite_v400mix.png', count: 4 },
  { id: 'pods-recarregaveis', name: 'PODS RECARREGÁVEIS (VÁRIOS MODELOS)', image: '/product_kit_lifepod.png', count: 10 },
  { id: 'acessorios', name: 'ACESSÓRIOS (VAPER)', image: '/product_ignite_v300.png', count: 15 },
  { id: 'resistencias', name: 'RESISTENCIAS VARIÁVEIS', image: '/product_ignite_v300.png', count: 8 },
  { id: 'essencias-juice', name: 'ESSÊNCIAS JUICE (VAPER) 100ml', image: '/product_ignite_v300.png', count: 20 },
  { id: 'essencias-nicsalt', name: 'ESSÊNCIAS NICSALT (POD)', image: '/product_ignite_v300.png', count: 25 },
];

export const promotions: Promotion[] = [
  {
    id: 'condicao-especial',
    title: 'CONDIÇÃO ESPECIAL HOUSE',
    description: 'Basicamente voce escolhe um modelo para compra, e a segunda unidade dele sai com 15% de desconto na mesma compra, podendo ser qualquer sabor (todos os produtos do site entram nesta condição)',
    image: '/promo_condicao_especial.png',
    badge: 'PROMOÇÃO ESPECIAL',
  },
  {
    id: 'compre6pague5',
    title: 'COMPRE 6 PAGUE 5',
    description: 'Basicamente voce escolhendo 6 unidades do mesmo modelo, voce paga apenas por 5 levando o sexto produto de GRAÇA, (para duvidas consulte um de nossos vendedores)',
    image: '/promo_compre6pague5.png',
    badge: 'COMPRE 5 LEVE 6',
  },
];

export const featuredProducts: Product[] = [
  {
    id: 'ignite-v400mix-1',
    name: 'IGNITE V400 MIX 40.000 PUFFS',
    price: 139.90,
    image: '/product_ignite_v400mix.png',
    category: 'ignite-v400mix',
    puffs: '40.000 PUFFS',
    inStock: true,
  },
  {
    id: 'kit-lifepod-1',
    name: 'KIT LIFE POD 10K (MONTE VOCÊ MESMO)',
    price: 129.90,
    image: '/product_kit_lifepod.png',
    category: 'kit-lifepod',
    puffs: '10.000 PUFFS',
    inStock: true,
  },
  {
    id: 'elfbar-iceking-1',
    name: 'ELFBAR ICE KING 40MIL PUFFS',
    price: 129.90,
    image: '/product_elfbar_iceking.png',
    category: 'elfbar-iceking',
    puffs: '40.000 PUFFS',
    inStock: true,
  },
  {
    id: 'ignite-v300ultra-1',
    name: 'IGNITE V300 ULTRA SLIM 30.000 PUFFS',
    price: 124.90,
    image: '/product_ignite_v300.png',
    category: 'ignite-v300ultra',
    puffs: '30.000 PUFFS',
    inStock: true,
  },
  {
    id: 'blacksheep-30k-dual-1',
    name: 'BLACK SHEEP 30K DUAL TANK',
    price: 119.90,
    originalPrice: 129.90,
    image: '/product_ignite_v400mix.png',
    category: 'blacksheep-30k-dual',
    puffs: '30.000 PUFFS',
    inStock: true,
  },
];

export const allProducts: Product[] = [
  ...featuredProducts,
  {
    id: 'ignite-v15-1',
    name: 'IGNITE V15 1.500MIL PUFFS',
    price: 49.90,
    image: '/cat_ignite_v15.png',
    category: 'ignite-v15',
    puffs: '1.500 PUFFS',
    inStock: true,
  },
  {
    id: 'ignite-v55-1',
    name: 'IGNITE V55 THIN 5.500 PUFFS',
    price: 69.90,
    image: '/cat_ignite_v55.png',
    category: 'ignite-v55',
    puffs: '5.500 PUFFS',
    inStock: true,
  },
  {
    id: 'ignite-v80-1',
    name: 'IGNITE V80 8.000 PUFFS',
    price: 79.90,
    image: '/cat_ignite_v80.png',
    category: 'ignite-v80',
    puffs: '8.000 PUFFS',
    inStock: true,
  },
  {
    id: 'ignite-v155-1',
    name: 'IGNITE V155 SLIM 15.500 PUFFS',
    price: 99.90,
    image: '/cat_ignite_v155.png',
    category: 'ignite-v155',
    puffs: '15.500 PUFFS',
    inStock: true,
  },
  {
    id: 'ignite-v250-1',
    name: 'IGNITE V250 25.000 PUFFS',
    price: 109.90,
    image: '/cat_ignite_v250.png',
    category: 'ignite-v250',
    puffs: '25.000 PUFFS',
    inStock: true,
  },
  {
    id: 'ignite-v300-1',
    name: 'IGNITE V300 30.000 PUFFS',
    price: 119.90,
    image: '/cat_ignite_v300.png',
    category: 'ignite-v300',
    puffs: '30.000 PUFFS',
    inStock: true,
  },
  {
    id: 'ignite-v400-1',
    name: 'IGNITE V400 40.000 PUFFS',
    price: 134.90,
    image: '/cat_ignite_v400.png',
    category: 'ignite-v400',
    puffs: '40.000 PUFFS',
    inStock: true,
  },
  {
    id: 'lifepod-10k-1',
    name: 'REFIL LIFE POD 10K 10.000 PUFFS',
    price: 89.90,
    image: '/product_kit_lifepod.png',
    category: 'lifepod-10k',
    puffs: '10.000 PUFFS',
    inStock: true,
  },
  {
    id: 'elfbar-te30k-1',
    name: 'ELFBAR TE 30K 30.000 PUFFS',
    price: 119.90,
    image: '/product_elfbar_iceking.png',
    category: 'elfbar-te30k',
    puffs: '30.000 PUFFS',
    inStock: true,
  },
  {
    id: 'oxbar-30k-1',
    name: 'OXBAR 30MIL PUFFS',
    price: 114.90,
    image: '/product_ignite_v300.png',
    category: 'oxbar-30k',
    puffs: '30.000 PUFFS',
    inStock: true,
  },
];
