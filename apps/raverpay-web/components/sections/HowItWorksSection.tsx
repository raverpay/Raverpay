'use client';

import { landingPageContent } from '@/content/landing-page-content';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/animations';
import * as LucideIcons from 'lucide-react';

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 lg:py-32 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
          >
            {landingPageContent.howItWorks.title}
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-muted-foreground">
            {landingPageContent.howItWorks.subtitle}
          </motion.p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-20" />

            {landingPageContent.howItWorks.steps.map((step, index) => {
              const IconComponent =
                (LucideIcons[step.icon as keyof typeof LucideIcons] as React.ComponentType<{
                  className?: string;
                }>) || LucideIcons.Circle;

              return (
                <motion.div
                  key={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeInUp}
                  transition={{ delay: index * 0.2 }}
                  className="relative z-10"
                >
                  <div className="text-center">
                    {/* Step Number */}
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent text-3xl font-bold text-white mb-6 shadow-lg">
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div className="mb-4 flex justify-center">
                      <div className="w-16 h-16 rounded-xl glass border border-primary/20 flex items-center justify-center">
                        <IconComponent className="w-8 h-8 text-primary" />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>

                    {/* Description */}
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
