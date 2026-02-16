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
    Building2,
    UsersRound,
    Trophy,
    UserCog,
    BookOpen,
    Package,
    ArrowLeftRight,
    FileSpreadsheet,
    BarChart3,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface MenuItem {
    href: string
    label: string
    icon: LucideIcon
    permission?: string
}

export interface MenuModule {
    title: string
    permission?: string
    items: MenuItem[]
}

/**
 * Configuração modular dos menus do painel administrativo
 */
export const menuModules: MenuModule[] = [
    // Módulo Principal
    {
        title: 'Menu Principal',
        items: [
            {
                href: '/admin',
                label: 'Início',
                icon: LayoutDashboard,
                permission: 'dashboard'
            },
            {
                href: '/admin/configuracoes',
                label: 'Ajustes do Site',
                icon: Settings,
                permission: 'configuracoes'
            },
        ],
    },

    // Módulo de Usuários e Permissões
    {
        title: 'Usuários',
        items: [
            {
                href: '/admin/pessoas',
                label: 'Pessoas',
                icon: UserCircle,
                permission: 'pessoas'
            },
            {
                href: '/admin/usuarios',
                label: 'Usuários e perfis',
                icon: Users,
                permission: 'usuarios'
            },
            {
                href: '/admin/roles',
                label: 'Gerenciar Permissões',
                icon: Shield,
                permission: 'roles'
            },
        ],
    },

    // Módulo de Mídia
    {
        title: 'Mídia',
        items: [
            {
                href: '/admin/upload',
                label: 'Upload',
                icon: Upload,
                permission: 'upload'
            },
            {
                href: '/admin/galeria',
                label: 'Galeria',
                icon: ImageIcon,
                permission: 'galeria'
            },
        ],
    },

    // Módulo de Consolidação
    {
        title: 'Consolidação',
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
                href: '/admin/consolidacao/cadastros',
                label: 'Cadastros',
                icon: BookUser,
                permission: 'consolidacao'
            },
        ],
    },

    // Módulo Livraria
    {
        title: 'Livraria',
        permission: 'livraria_produtos',
        items: [
            {
                href: '/admin/livraria/produtos',
                label: 'Produtos',
                icon: BookOpen,
                permission: 'livraria_produtos'
            },
            {
                href: '/admin/livraria/estoque',
                label: 'Estoque',
                icon: Package,
                permission: 'livraria_estoque'
            },
            {
                href: '/admin/livraria/movimentacoes',
                label: 'Movimentações',
                icon: ArrowLeftRight,
                permission: 'livraria_movimentacoes'
            },
            {
                href: '/admin/livraria/importacao',
                label: 'Importação/Exportação',
                icon: FileSpreadsheet,
                permission: 'livraria_importacao'
            },
            {
                href: '/admin/livraria/dashboard',
                label: 'Dashboard',
                icon: BarChart3,
                permission: 'livraria_dashboard'
            },
        ],
    },

    // Módulo Instagram
    {
        title: 'Instagram',
        permission: 'instagram',
        items: [
            {
                href: '/admin/instancias',
                label: 'Configurações do Instagram/Facebook',
                icon: Instagram,
                permission: 'instagram'
            },
            {
                href: '/admin/instagram/posts',
                label: 'Painel de publicações',
                icon: Instagram,
                permission: 'instagram'
            },
            {
                href: '/admin/instagram/collaboration',
                label: 'Convites de Colaboração',
                icon: Instagram,
                permission: 'instagram'
            },
        ],
    },
]
