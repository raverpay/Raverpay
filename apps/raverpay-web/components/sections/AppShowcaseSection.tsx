'use client';

import { Button } from '@/components/ui/button';
import { landingPageContent } from '@/content/landing-page-content';
import { motion } from 'framer-motion';
import { fadeInUp, slideInRight } from '@/lib/animations';
import { Smartphone } from 'lucide-react';

export function AppShowcaseSection() {
  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              {landingPageContent.appShowcase.title}
            </h2>
            <p className="text-xl text-muted-foreground mb-6">
              {landingPageContent.appShowcase.subtitle}
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              {landingPageContent.appShowcase.description}
            </p>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {landingPageContent.appShowcase.downloadButtons.appStore.available ? (
                <Button asChild size="lg" variant="outline">
                  <a href={landingPageContent.appShowcase.downloadButtons.appStore.href}>
                    {landingPageContent.appShowcase.downloadButtons.appStore.label}
                  </a>
                </Button>
              ) : (
                <Button asChild size="lg" variant="outline" disabled>
                  <a href="#">{landingPageContent.appShowcase.comingSoon}</a>
                </Button>
              )}

              {landingPageContent.appShowcase.downloadButtons.googlePlay.available ? (
                <Button asChild size="lg" variant="outline">
                  <a href={landingPageContent.appShowcase.downloadButtons.googlePlay.href}>
                    {landingPageContent.appShowcase.downloadButtons.googlePlay.label}
                  </a>
                </Button>
              ) : (
                <Button asChild size="lg" variant="outline" disabled>
                  <a href="#">{landingPageContent.appShowcase.comingSoon}</a>
                </Button>
              )}
            </div>

            {(!landingPageContent.appShowcase.downloadButtons.appStore.available ||
              !landingPageContent.appShowcase.downloadButtons.googlePlay.available) && (
              <div className="mt-6">
                <Button asChild size="lg">
                  <a href="#cta">{landingPageContent.appShowcase.waitlistCta}</a>
                </Button>
              </div>
            )}
          </motion.div>

          {/* Phone Mockup */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={slideInRight}
            className="relative flex justify-center"
          >
            <div className="relative w-full max-w-sm">
              {/* Phone Frame */}
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-[3rem] p-4 shadow-2xl">
                <div className="bg-black rounded-[2.5rem] overflow-hidden aspect-[9/19.5]">
                  {/* Placeholder for app screenshots */}
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                    <div className="text-center p-8">
                      <Smartphone className="w-16 h-16 mx-auto mb-4 text-primary/50" />
                      <p className="text-muted-foreground text-sm">
                        App screenshots will be displayed here
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Glow effect */}
              <div className="absolute inset-0 bg-primary/20 rounded-[3rem] blur-2xl -z-10" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
