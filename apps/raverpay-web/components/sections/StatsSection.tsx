'use client';

import { landingPageContent } from '@/content/landing-page-content';
import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import * as LucideIcons from 'lucide-react';

function useCountUp(end: number, duration: number, inView: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;

    let startTime: number | null = null;
    const startValue = 0;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(startValue + (end - startValue) * easeOutQuart));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration, inView]);

  return count;
}

function StatCard({
  value,
  prefix = '',
  suffix = '',
  label,
  icon,
  delay = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  icon: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const count = useCountUp(value, 2000, inView);

  const IconComponent =
    (LucideIcons[icon as keyof typeof LucideIcons] as React.ComponentType<{
      className?: string;
    }>) || LucideIcons.TrendingUp;

  const displayValue =
    value >= 1000000
      ? `${prefix}${(count / 1000000).toFixed(1)}M${suffix}`
      : value >= 1000
        ? `${prefix}${(count / 1000).toFixed(0)}K${suffix}`
        : `${prefix}${count}${suffix}`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="text-center"
    >
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-xl glass border border-primary/20 flex items-center justify-center">
          <IconComponent className="w-8 h-8 text-primary" />
        </div>
      </div>
      <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-gradient mb-2">
        {displayValue}
      </div>
      <div className="text-lg text-muted-foreground">{label}</div>
    </motion.div>
  );
}

export function StatsSection() {
  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/10 to-background" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {landingPageContent.stats.items.map((stat, index) => (
            <StatCard
              key={index}
              value={parseFloat(stat.value)}
              prefix={stat.prefix || ''}
              suffix={stat.suffix || ''}
              label={stat.label}
              icon={stat.icon}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
