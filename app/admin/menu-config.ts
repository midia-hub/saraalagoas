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
    CalendarDays,
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

    // Dashboard - sempre o primeiro item
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

    // Módulo Reservas de Salas
    {
        id: 'reservas',
        title: 'Reservas de Salas',
        icon: LayoutGrid,
        permission: 'reservas',
        items: [
            { href: '/admin/reservas', label: 'Solicitações', icon: ClipboardList, permission: 'reservas' },
            { href: '/admin/reservas/salas', label: 'Salas', icon: Building2, permission: 'reservas' },
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
                href: '/admin/lideranca/meu-discipulado',
                label: 'Discipulado',
                icon: UsersRound,
                permission: 'pessoas'
            },
            {
                href: '/admin/lideranca/estrutura',
                label: 'Estrutura de Liderança',
                icon: UsersRound,
                permission: 'pessoas'
            },
        ],
    },

    // Módulo Escalas
    {
        id: 'escalas',
        title: 'Escalas',
        icon: CalendarDays,
        permission: 'escalas',
        items: [
            {
                href: '/admin/escalas',
                label: 'Disponibilidades',
                icon: CalendarDays,
                permission: 'escalas'
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
                label: 'Painel de Células',
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
                label: 'Registrar Conversão',
                icon: UserPlus,
                permission: 'consolidacao'
            },
            {
                href: '/admin/consolidacao/lista',
                label: 'Convertidos',
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
                href: '/admin/consolidacao/cadastros/mensagens-conversao',
                label: 'Mensagens de Conversão',
                icon: MessageSquare,
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
                label: 'Lista de Eventos',
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
                label: 'Reservas de Livros',
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
                label: 'Controle de Estoque',
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
                label: 'Clientes',
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
                label: 'Importação / Exportação',
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
                href: '/admin/upload',
                label: 'Upload de Arquivos',
                icon: Upload,
                permission: 'upload'
            },
            {
                href: '/admin/instagram/posts',
                label: 'Posts do Instagram',
                icon: Instagram,
                permission: 'instagram'
            },
            {
                href: '/admin/instancias',
                label: 'Configuração do Instagram',
                icon: Settings,
                permission: 'instagram'
            },
        ],
    },

    // Módulo de Cadastros (tabelas de referência compartilhadas)
    {
        id: 'cadastros',
        title: 'Cadastros',
        icon: UserCircle,
        items: [
            {
                href: '/admin/pessoas',
                label: 'Membros e Visitantes',
                icon: UserCircle,
                permission: 'pessoas'
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

    // Módulo de Configurações
    {
        id: 'configuracoes',
        title: 'Configurações',
        icon: Settings,
        permission: 'configuracoes',
        items: [
            {
                href: '/admin/configuracoes',
                label: 'Site e Aparência',
                icon: LayoutGrid,
                permission: 'configuracoes'
            },
            {
                href: '/admin/roles',
                label: 'Permissões de Acesso',
                icon: Shield,
                permission: 'roles'
            },
            {
                href: '/admin/consolidacao/cadastros/api-disparos',
                label: 'API de Disparos',
                icon: Link2,
                permission: 'usuarios'
            },
        ],
    },
]
