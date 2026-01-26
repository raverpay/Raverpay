import { HeroSection } from '@/components/sections/HeroSection';
import { SocialProofSection } from '@/components/sections/SocialProofSection';
import { FeaturesSection } from '@/components/sections/FeaturesSection';
import { HowItWorksSection } from '@/components/sections/HowItWorksSection';
import { AppShowcaseSection } from '@/components/sections/AppShowcaseSection';
import { SecuritySection } from '@/components/sections/SecuritySection';
import { StatsSection } from '@/components/sections/StatsSection';
import { CTASection } from '@/components/sections/CTASection';
import { Footer } from '@/components/sections/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <SocialProofSection />
      <FeaturesSection />
      <HowItWorksSection />
      <AppShowcaseSection />
      <SecuritySection />
      <StatsSection />
      <CTASection />
      <Footer />
    </main>
  );
}
