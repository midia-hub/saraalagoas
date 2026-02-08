/** Tipos da configuração do site (usados no Admin e no contexto) */

export interface MenuItem {
  id: string
  label: string
}

export interface Address {
  street: string
  district: string
  city: string
  state: string
  full: string
  mapUrl: string
  embedUrl: string
}

export interface Leader {
  name: string
  role: string
  instagram: string
  image: string
}

export interface Service {
  id: string
  name: string
  day: string
  time: string
  type: string
  description: string
}

export interface CellBenefit {
  title: string
  description: string
}

export interface SiteConfig {
  name: string
  description: string
  url: string
  whatsappNumber: string
  whatsappMessages: {
    general: string
    prayer: string
    cell: string
    immersion: string
  }
  social: {
    instagram: string
    youtube: string
  }
  address: Address
  leadership: Leader[]
  services: Service[]
  mission: {
    short: string
    full: string
  }
  immersion: {
    title: string
    description: string
    features: string[]
    images: string[]
  }
  cell: {
    title: string
    description: string
    benefits: CellBenefit[]
  }
  kids: {
    title: string
    description: string
    features: string[]
    images: string[]
  }
  offerings: {
    title: string
    description: string
    url: string
  }
  menuItems: MenuItem[]
}
