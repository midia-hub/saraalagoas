import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Footer from '@/components/Footer'
const FloatingWhatsApp = dynamic(() => import('@/components/FloatingWhatsApp'), { ssr: false })
import { redirect } from 'next/navigation'
import { getConfiguredHomeRoute } from '@/lib/home-route'
import HomeLoadGuard from '@/components/HomeLoadGuard'

import SectionSkeleton from '@/components/SectionSkeleton'

const ServicesSection = dynamic(() => import('@/components/ServicesSection'), {
  ssr: true,
  loading: () => <SectionSkeleton />
})
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

  return (
    <HomeLoadGuard>
      <Header />
      <main>
        <Hero />
        <ServicesSection />
        <CellSection />
        <LeadershipSection />
        <SocialSection />
        <PrayerSection />
        <LocationSection />
        <MissionSection />
        <GallerySection />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </HomeLoadGuard>
  )
}
