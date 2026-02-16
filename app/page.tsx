import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Footer from '@/components/Footer'
import FloatingWhatsApp from '@/components/FloatingWhatsApp'
import { redirect } from 'next/navigation'
import { getConfiguredHomeRoute } from '@/lib/home-route'

const ServicesSection = dynamic(() => import('@/components/ServicesSection'), { ssr: true })
const CellSection = dynamic(() => import('@/components/CellSection'), { ssr: true })
const LeadershipSection = dynamic(() => import('@/components/LeadershipSection'), { ssr: true })
const SocialSection = dynamic(() => import('@/components/SocialSection'), { ssr: true })
const PrayerSection = dynamic(() => import('@/components/PrayerSection'), { ssr: true })
const LocationSection = dynamic(() => import('@/components/LocationSection'), { ssr: true })
const MissionSection = dynamic(() => import('@/components/MissionSection'), { ssr: true })
const GallerySection = dynamic(() => import('@/components/GallerySection'), { ssr: true })

export default async function Home() {
  const homeRoute = await getConfiguredHomeRoute()
  if (homeRoute && homeRoute !== '/') {
    redirect(homeRoute)
  }

  return (
    <>
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
    </>
  )
}
