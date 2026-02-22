import {
    LayoutDashboard,
    Settings,
    Users,
    UserCircle,
    Upload,
    Image as ImageIcon,
    Instagram,
    Shield,
    UserPlus,
    ClipboardList,
    BookUser,
    Trophy,
    UserCog,
    BookOpen,
    Package,
    ArrowLeftRight,
    FileSpreadsheet,
    BarChart3,
    ShoppingCart,
    History,
    Bookmark,
    UserCheck,
    CreditCard,
    Ticket,
    Store,
    LayoutGrid,
    MessageSquare,
    Link2,
    Building2,
    UsersRound,
    DollarSign,
    Heart,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface MenuItem {
    href: string
    label: string
    icon?: LucideIcon
    permission?: string
}

export interface MenuModule {
    id: string
    title: string
    icon: LucideIcon
    permission?: string
    items: MenuItem[]
}

/**
 * Configuração modular dos menus do painel administrativo
 */
export const menuModules: MenuModule[] = [
    // Dashboard - Sempre visível ou com permissão específica
    {
        id: 'dashboard',
        title: 'Painel Geral',
        icon: LayoutDashboard,
        items: [
            {
                href: '/admin',
                label: 'Início',
                icon: LayoutDashboard,
                permission: 'dashboard'
            }
        ],
    },

    // Módulo de Liderança
    {
        id: 'lideranca',
        title: 'Liderança',
        icon: UsersRound,
        permission: 'pessoas',
        items: [
            {
                href: '/admin/lideranca/estrutura',
                label: 'Estrutura de Liderança',
                icon: UsersRound,
                permission: 'pessoas'
            },
            {
                href: '/admin/lideranca/meu-discipulado',
                label: 'Meu Discipulado',
                icon: UsersRound,
                permission: 'pessoas'
            },
            {
                href: '/admin/lideranca/rede-completa',
                label: 'Rede Completa',
                icon: UsersRound,
                permission: 'pessoas'
            },
        ],
    },

    // Módulo Células
    {
        id: 'celulas',
        title: 'Células',
        icon: UsersRound,
        permission: 'celulas',
        items: [
            {
                href: '/admin/celulas',
                label: 'Gerenciar Células',
                icon: UsersRound,
                permission: 'celulas'
            },
            {
                href: '/admin/celulas/dashboard',
                label: 'Dashboard',
                icon: BarChart3,
                permission: 'celulas'
            },
            {
                href: '/admin/celulas/pd-management',
                label: 'Gerenciar PD',
                icon: DollarSign,
                permission: 'celulas'
            },
        ],
    },

    // Módulo de Consolidação
    {
        id: 'consolidacao',
        title: 'Consolidação',
        icon: UserPlus,
        permission: 'consolidacao',
        items: [
            {
                href: '/admin/consolidacao/conversoes',
                label: 'Formulário de Conversão',
                icon: UserPlus,
                permission: 'consolidacao'
            },
            {
                href: '/admin/consolidacao/lista',
                label: 'Lista de Convertidos',
                icon: ClipboardList,
                permission: 'consolidacao'
            },
            {
                href: '/admin/consolidacao/acompanhamento',
                label: 'Acompanhamento',
                icon: BookUser,
                permission: 'consolidacao'
            },
            {
                href: '/admin/consolidacao/relatorios',
                label: 'Relatórios',
                icon: BarChart3,
                permission: 'consolidacao'
            },
            {
                href: '/admin/consolidacao/cadastros/igrejas',
                label: 'Igrejas',
                icon: Building2,
                permission: 'consolidacao'
            },
            {
                href: '/admin/consolidacao/cadastros/arenas',
                label: 'Arenas',
                icon: Trophy,
                permission: 'consolidacao'
            },
            {
                href: '/admin/consolidacao/cadastros/equipes',
                label: 'Equipes',
                icon: UserCog,
                permission: 'consolidacao'
            },
        ],
    },

    // Módulo Revisão de Vidas
    {
        id: 'revisao-vidas',
        title: 'Revisão de Vidas',
        icon: Heart,
        permission: 'revisao_vidas',
        items: [
            {
                href: '/admin/revisao-vidas',
                label: 'Eventos',
                icon: Heart,
                permission: 'revisao_vidas'
            },
            {
                href: '/admin/revisao-vidas/inscritos',
                label: 'Inscritos',
                icon: ClipboardList,
                permission: 'revisao_vidas'
            },
        ],
    },

    // Módulo Livraria
    {
        id: 'livraria',
        title: 'Livraria',
        icon: BookOpen,
        permission: 'livraria_produtos',
        items: [
            {
                href: '/admin/livraria/vendas',
                label: 'Vendas (PDV)',
                icon: ShoppingCart,
                permission: 'livraria_pdv'
            },
            {
                href: '/admin/livraria/loja-caixa',
                label: 'Loja e Caixa',
                icon: Store,
                permission: 'livraria_pdv'
            },
            {
                href: '/admin/livraria/vendas/historico',
                label: 'Histórico de Vendas',
                icon: History,
                permission: 'livraria_vendas'
            },
            {
                href: '/admin/livraria/vendas/reservas',
                label: 'Reservas',
                icon: Bookmark,
                permission: 'livraria_reservas'
            },
            {
                href: '/admin/livraria/produtos',
                label: 'Catálogo de Produtos',
                icon: Package,
                permission: 'livraria_produtos'
            },
            {
                href: '/admin/livraria/estoque',
                label: 'Gestão de Estoque',
                icon: ArrowLeftRight,
                permission: 'livraria_estoque'
            },
            {
                href: '/admin/livraria/movimentacoes',
                label: 'Movimentações',
                icon: ArrowLeftRight,
                permission: 'livraria_movimentacoes'
            },
            {
                href: '/admin/livraria/clientes',
                label: 'Gestão de Clientes',
                icon: UserCheck,
                permission: 'livraria_clientes'
            },
            {
                href: '/admin/livraria/fiado',
                label: 'Controle de Fiado',
                icon: CreditCard,
                permission: 'livraria_fiado'
            },
            {
                href: '/admin/livraria/cupons',
                label: 'Cupons de Desconto',
                icon: Ticket,
                permission: 'livraria_cupons'
            },
            {
                href: '/admin/livraria/dashboard',
                label: 'Relatórios e BI',
                icon: BarChart3,
                permission: 'livraria_dashboard'
            },
            {
                href: '/admin/livraria/importacao',
                label: 'Importação/Exportação',
                icon: FileSpreadsheet,
                permission: 'livraria_importacao'
            },
        ],
    },

    // Módulo de Mídia e Social
    {
        id: 'midia',
        title: 'Mídia e Social',
        icon: ImageIcon,
        permission: 'galeria',
        items: [
            {
                href: '/admin/galeria',
                label: 'Galeria de Fotos',
                icon: ImageIcon,
                permission: 'galeria'
            },
            {
                href: '/admin/upload',
                label: 'Upload de Arquivos',
                icon: Upload,
                permission: 'upload'
            },
            {
                href: '/admin/instagram/posts',
                label: 'Posts Instagram',
                icon: Instagram,
                permission: 'instagram'
            },
            {
                href: '/admin/instagram/collaboration',
                label: 'Colaboradores',
                icon: MessageSquare,
                permission: 'instagram'
            },
            {
                href: '/admin/instancias',
                label: 'Configurar Instagram',
                icon: Settings,
                permission: 'instagram'
            },
            {
                href: '#',
                label: 'Facebook',
                icon: MessageSquare,
                permission: 'facebook'
            },
            {
                href: '#',
                label: 'Integrações Meta',
                icon: MessageSquare,
                permission: 'meta'
            },
        ],
    },

    // Módulo de Cadastros
    {
        id: 'cadastros',
        title: 'Cadastros',
        icon: UserCircle,
        permission: 'pessoas',
        items: [
            {
                href: '/admin/pessoas',
                label: 'Pessoas',
                icon: UserCircle,
                permission: 'pessoas'
            },
        ],
    },

    // Módulo de Configurações
    {
        id: 'configuracoes',
        title: 'Configurações',
        icon: Settings,
        permission: 'configuracoes',
        items: [
            {
                href: '/admin/configuracoes',
                label: 'Ajustes do Site',
                icon: LayoutGrid,
                permission: 'configuracoes'
            },
            {
                href: '/admin/roles',
                label: 'Gerenciar Permissões',
                icon: Shield,
                permission: 'roles'
            },
            {
                href: '/cultos',
                label: 'Cultos',
                icon: BookOpen,
                permission: 'configuracoes'
            },
            {
                href: '/eventos',
                label: 'Eventos',
                icon: Ticket,
                permission: 'configuracoes'
            },
            {
                href: '/admin/consolidacao/cadastros/api-disparos',
                label: 'API de Disparos',
                icon: Link2,
                permission: 'usuarios'
            },
            {
                href: '/admin/consolidacao/cadastros/mensagens-conversao',
                label: 'Mensagens de Conversão',
                icon: MessageSquare,
                permission: 'consolidacao'
            },
        ],
    },
]
