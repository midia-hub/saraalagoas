import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Footer from '@/components/Footer'
const FloatingWhatsApp = dynamic(() => import('@/components/FloatingWhatsApp'), { ssr: false })
import { redirect } from 'next/navigation'
import { getConfiguredHomeRoute } from '@/lib/home-route'
import { getSiteConfig } from '@/lib/site-config-server'

import SectionSkeleton from '@/components/SectionSkeleton'
import ServicesSection from '@/components/ServicesSection'

const CellSection = dynamic(() => import('@/components/CellSection'), {
  ssr: true,
  loading: () => <SectionSkeleton />
})
const LeadershipSection = dynamic(() => import('@/components/LeadershipSection'), {
  ssr: true,
  loading: () => <SectionSkeleton />
})
const SocialSection = dynamic(() => import('@/components/SocialSection'), {
  ssr: true,
  loading: () => <SectionSkeleton />
})
const PrayerSection = dynamic(() => import('@/components/PrayerSection'), {
  ssr: true,
  loading: () => <SectionSkeleton />
})
const LocationSection = dynamic(() => import('@/components/LocationSection'), {
  ssr: true,
  loading: () => <SectionSkeleton />
})
const MissionSection = dynamic(() => import('@/components/MissionSection'), {
  ssr: true,
  loading: () => <SectionSkeleton />
})
const GallerySection = dynamic(() => import('@/components/GallerySection'), {
  ssr: true,
  loading: () => <SectionSkeleton />
})

export default async function Home() {
  const homeRoute = await getConfiguredHomeRoute()
  if (homeRoute && homeRoute !== '/') {
    redirect(homeRoute)
  }

  const siteConfig = await getSiteConfig()
  const layout = siteConfig.layout || [
    'hero', 'services', 'cell', 'leadership', 'social', 'prayer', 'location', 'mission', 'gallery'
  ]
  const hiddenSections: string[] = (siteConfig as any).hiddenSections || []
  const visibleLayout = layout.filter(id => !hiddenSections.includes(id))

  const sectionMap: Record<string, React.ReactNode> = {
    hero: <Hero key="hero" />,
    services: <ServicesSection key="services" />,
    cell: <CellSection key="cell" />,
    leadership: <LeadershipSection key="leadership" />,
    social: <SocialSection key="social" />,
    prayer: <PrayerSection key="prayer" />,
    location: <LocationSection key="location" />,
    mission: <MissionSection key="mission" />,
    gallery: <GallerySection key="gallery" />
  }

  return (
    <>
      <Header />
      <main>
        {visibleLayout.map(id => sectionMap[id])}
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  )
}
