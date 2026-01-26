'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { landingPageContent } from '@/content/landing-page-content';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/animations';
import * as LucideIcons from 'lucide-react';

export function SecuritySection() {
  return (
    <section id="security" className="py-20 lg:py-32">
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
            {landingPageContent.security.title}
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-muted-foreground">
            {landingPageContent.security.subtitle}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
        >
          {landingPageContent.security.features.map((feature, index) => {
            const IconComponent =
              (LucideIcons[feature.icon as keyof typeof LucideIcons] as React.ComponentType<{
                className?: string;
              }>) || LucideIcons.Shield;

            return (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="glass border-primary/20 hover:border-primary/50 transition-all duration-300">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
