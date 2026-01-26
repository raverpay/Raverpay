'use client';

import { motion } from 'framer-motion';
import { landingPageContent } from '@/content/landing-page-content';

export function SocialProofSection() {
  return (
    <section className="py-12 border-y border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-8 md:gap-16 overflow-hidden">
          {landingPageContent.socialProof.stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center gap-2 min-w-[120px]"
            >
              <div className="text-2xl md:text-3xl font-bold text-gradient">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
