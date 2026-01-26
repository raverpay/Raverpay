'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { landingPageContent } from '@/content/landing-page-content';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/animations';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 lg:pt-32 pb-20 overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto text-center"
        >
          {/* Trust Indicators */}
          <motion.div
            variants={fadeInUp}
            className="flex items-center justify-center gap-4 mb-8 flex-wrap"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground/80">
                {landingPageContent.hero.trustIndicators.cacRegistered}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20">
              <span className="text-sm text-foreground/80">
                Trusted by {landingPageContent.hero.trustIndicators.usersCount}
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
          >
            {landingPageContent.hero.headline}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeInUp}
            className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            {landingPageContent.hero.subheadline}
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button asChild size="lg" className="group">
              <a href="#cta">
                {landingPageContent.hero.primaryCta}
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="group">
              <a href="#how-it-works">
                {landingPageContent.hero.secondaryCta}
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
          </motion.div>

          {/* Hero Visual Placeholder */}
          <motion.div variants={fadeInUp} className="mt-16 relative">
            <div className="relative w-full max-w-3xl mx-auto aspect-video rounded-2xl glass-strong border border-primary/20 overflow-hidden">
              {/* Placeholder for hero visual - can be replaced with actual image/mockup */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-muted-foreground text-center p-8">
                  <p className="text-lg mb-2">Hero Visual Placeholder</p>
                  <p className="text-sm">3D card mockup or animated illustration will go here</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
