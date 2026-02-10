import Header from '@/components/Header'
import Hero from '@/components/Hero'
import ServicesSection from '@/components/ServicesSection'
import CellSection from '@/components/CellSection'
import LeadershipSection from '@/components/LeadershipSection'
import SocialSection from '@/components/SocialSection'
import PrayerSection from '@/components/PrayerSection'
import ImmersionSection from '@/components/ImmersionSection'
import OfferingsSection from '@/components/OfferingsSection'
import KidsSection from '@/components/KidsSection'
import LocationSection from '@/components/LocationSection'
import MissionSection from '@/components/MissionSection'
import GallerySection from '@/components/GallerySection'
import Footer from '@/components/Footer'
import FloatingWhatsApp from '@/components/FloatingWhatsApp'
import { redirect } from 'next/navigation'
import { getConfiguredHomeRoute } from '@/lib/home-route'

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
        <ImmersionSection />
        <OfferingsSection />
        <KidsSection />
        <LocationSection />
        <MissionSection />
        <GallerySection />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  )
}
