export type GalleryType = 'culto' | 'evento'

export interface WorshipServiceRow {
  id: string
  name: string
  slug: string
  active: boolean
  created_at: string
}

export interface GalleryRow {
  id: string
  type: GalleryType
  title: string
  slug: string
  date: string
  description: string | null
  drive_folder_id: string
  created_at: string
}

/** Modelo de Álbum na UI (admin galeria). Campos opcionais vêm de lazy enrichment. */
export interface Album {
  id: string
  title: string
  type: GalleryType
  date: string
  slug: string
  /** Data de criação no backend; usada como "última atualização" quando não há updated_at */
  created_at: string
  coverUrl?: string
  photosCount?: number
  updatedAt?: string
  /** Caminho público da galeria: /galeria/[type]/[slug]/[date] */
  publicPath: string
  /** ID da pasta no Google Drive (para link "Abrir no Drive") */
  drive_folder_id?: string
}

