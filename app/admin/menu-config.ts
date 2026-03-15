import {
    LayoutDashboard,
    Settings,
    Users,
    UserCircle,
    Image as ImageIcon,
    Share2 as Instagram,
    Shield,
    UserPlus,
    ClipboardList,
    BookUser,
    Trophy,
    UserCog,
    BookOpen,
    Package,
    ArrowLeftRight,
    BarChart3,
    ShoppingCart,
    History,
    UserCheck,
    Store,
    LayoutGrid,
    MessageSquare,
    Link2,
    PenLine,
    Building2,
    UsersRound,
    DollarSign,
    Heart,
    CalendarDays,
    Baby,
    QrCode,
    Bot,
    ScanFace,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface MenuItem {
    href: string
    label: string
    icon?: LucideIcon
    permission?: string | string[]
}

export interface MenuModule {
    id: string
    title: string
    description?: string
    icon: LucideIcon
    color?: string
    permission?: string
    basePaths?: string[]
    mainHref?: string
    items: MenuItem[]
}

/**
 * Configuração modular dos menus do painel administrativo
 */
export const menuModules: MenuModule[] = [

    // Dashboard - hub de seleção de módulos
    {
        id: 'dashboard',
        title: 'Painel Geral',
        description: 'Visão geral da plataforma',
        icon: LayoutDashboard,
        color: '#C4232A',
        basePaths: ['/admin'],
        mainHref: '/admin',
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
        description: 'Solicitações e gerenciamento de espaços',
        icon: LayoutGrid,
        color: '#6366f1',
        permission: 'reservas',
        basePaths: ['/admin/reservas'],
        mainHref: '/admin/reservas/dashboard',
        items: [
            { href: '/admin/reservas', label: 'Solicitações', icon: ClipboardList, permission: 'reservas' },
            { href: '/admin/reservas/salas', label: 'Salas', icon: Building2, permission: 'reservas' },
        ],
    },

    // Módulo de Liderança
    {
        id: 'lideranca',
        title: 'Liderança',
        description: 'Discipulado e estrutura de liderança',
        icon: UsersRound,
        color: '#0ea5e9',
        permission: 'pessoas',
        basePaths: ['/admin/lideranca'],
        mainHref: '/admin/lideranca',
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
        description: 'Disponibilidades e escala de voluntários',
        icon: CalendarDays,
        color: '#64748b',
        permission: 'escalas',
        basePaths: ['/admin/escalas'],
        mainHref: '/admin/escalas/dashboard',
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
        description: 'Grupos, realizações, presenças e discipulado',
        icon: UsersRound,
        color: '#3b82f6',
        permission: 'celulas',
        basePaths: ['/admin/celulas'],
        mainHref: '/admin/celulas/dashboard',
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
        description: 'Conversões, followups e acompanhamento pastoral',
        icon: UserPlus,
        color: '#C4232A',
        permission: 'consolidacao',
        basePaths: ['/admin/consolidacao'],
        mainHref: '/admin/consolidacao',
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
        description: 'Eventos, inscrições e anamneses pastorais',
        icon: Heart,
        color: '#14b8a6',
        permission: 'revisao_vidas',
        basePaths: ['/admin/revisao-vidas'],
        mainHref: '/admin/revisao-vidas',
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
        description: 'Produtos, vendas, estoque e PDV',
        icon: BookOpen,
        color: '#f59e0b',
        permission: 'livraria_produtos',
        basePaths: ['/admin/livraria'],
        mainHref: '/admin/livraria/dashboard',
        items: [
            {
                href: '/admin/livraria/dashboard',
                label: 'Dashboard',
                icon: BarChart3,
                permission: 'livraria_dashboard'
            },
            {
                href: '/admin/livraria/vendas',
                label: 'Vendas (PDV)',
                icon: ShoppingCart,
                permission: 'livraria_pdv'
            },
            {
                href: '/admin/livraria/loja-caixa',
                label: 'Loja, Caixa e Cupons',
                icon: Store,
                permission: ['livraria_pdv', 'livraria_cupons']
            },
            {
                href: '/admin/livraria/vendas/historico',
                label: 'Histórico de Vendas',
                icon: History,
                permission: 'livraria_vendas'
            },
            {
                href: '/admin/livraria/produtos',
                label: 'Catálogo de Produtos',
                icon: Package,
                permission: ['livraria_produtos', 'livraria_importacao']
            },
            {
                href: '/admin/livraria/estoque',
                label: 'Estoque & Movimentações',
                icon: ArrowLeftRight,
                permission: 'livraria_estoque'
            },
            {
                href: '/admin/livraria/clientes',
                label: 'Clientes, Fiado & Reservas',
                icon: UserCheck,
                permission: ['livraria_clientes', 'livraria_fiado', 'livraria_reservas']
            },
        ],
    },

    // Módulo de Mídia e Social
    {
        id: 'midia',
        title: 'Mídia e Social',
        description: 'Galerias, Instagram, demandas e publicações',
        icon: ImageIcon,
        color: '#f97316',
        permission: 'galeria',
        basePaths: [
            '/admin/galeria',
            '/admin/midia',
            '/admin/instagram',
            '/admin/instancias',
            '/admin/rekognition',
            '/admin/upload',
        ],
        mainHref: '/admin/midia',
        items: [
            {
                href: '/admin/galeria',
                label: 'Galeria de Fotos',
                icon: ImageIcon,
                permission: 'galeria'
            },
            {
                href: '/admin/midia/nova-postagem',
                label: 'Nova Postagem',
                icon: PenLine,
                permission: 'instagram'
            },
            {
                href: '/admin/instagram/posts',
                label: 'Painel de Posts',
                icon: Instagram,
                permission: 'instagram'
            },
            {
                href: '/admin/midia/agenda-social',
                label: 'Agenda Mídia/Social',
                icon: CalendarDays,
                permission: 'instagram'
            },
            {
                href: '/admin/midia/demandas',
                label: 'Demandas de Mídia',
                icon: ClipboardList,
                permission: 'instagram'
            },
            {
                href: '/admin/instancias',
                label: 'Configuração do Instagram',
                icon: Settings,
                permission: 'instagram'
            },
            {
                href: '/admin/rekognition',
                label: 'Reconhecimento Facial',
                icon: ScanFace,
                permission: 'galeria'
            },
        ],
    },

    // Módulo de Pessoas e Membros
    {
        id: 'pessoas',
        title: 'Pessoas e Membros',
        description: 'Cadastro de membros, visitantes e pessoas',
        icon: UserCircle,
        color: '#8b5cf6',
        permission: 'pessoas',
        basePaths: ['/admin/pessoas'],
        mainHref: '/admin/pessoas/dashboard',
        items: [
            {
                href: '/admin/pessoas',
                label: 'Membros e Visitantes',
                icon: UserCircle,
                permission: 'pessoas'
            },
        ],
    },

    // Módulo Sara Kids
    {
        id: 'sara-kids',
        title: 'Sara Kids',
        description: 'Check-in, responsáveis e crianças no culto',
        icon: Baby,
        color: '#ec4899',
        permission: 'pessoas',
        basePaths: ['/admin/sara-kids'],
        mainHref: '/admin/sara-kids',
        items: [
            {
                href: '/admin/sara-kids',
                label: 'Painel Sara Kids',
                icon: Baby,
                permission: 'pessoas'
            },
            {
                href: '/admin/sara-kids/checkin',
                label: 'Check-in Culto Kids',
                icon: QrCode,
                permission: 'pessoas'
            },
            {
                href: '/admin/sara-kids/presentes',
                label: 'Crianças no Culto',
                icon: Heart,
                permission: 'pessoas'
            },
        ],
    },

    // Módulo de Configurações
    {
        id: 'configuracoes',
        title: 'Configurações',
        description: 'Usuários, permissões e configurações do sistema',
        icon: Settings,
        color: '#475569',
        permission: 'configuracoes',
        basePaths: [
            '/admin/configuracoes',
            '/admin/roles',
            '/admin/settings',
            '/admin/usuarios',
            '/admin/conta',
            '/admin/criar-acesso',
            '/admin/midia/ia-config',
            '/admin/consolidacao/cadastros/api-disparos',
        ],
        mainHref: '/admin/configuracoes',
        items: [
            {
                href: '/admin/configuracoes',
                label: 'Site e Aparência',
                icon: LayoutGrid,
                permission: 'configuracoes'
            },
            {
                href: '/admin/midia/ia-config',
                label: 'IA — Configuração de Prompts',
                icon: Bot,
                permission: 'instagram'
            },
            {
                href: '/admin/roles',
                label: 'Permissões de Acesso',
                icon: Shield,
                permission: 'roles'
            },
            {
                href: '/admin/usuarios',
                label: 'Usuários',
                icon: Users,
                permission: 'usuarios'
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
