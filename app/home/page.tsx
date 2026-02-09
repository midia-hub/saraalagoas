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
import Footer from '@/components/Footer'
import FloatingWhatsApp from '@/components/FloatingWhatsApp'

export default function HomePage() {
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
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  )
}
