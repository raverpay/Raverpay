'use client';

import Link from 'next/link';
import { landingPageContent } from '@/content/landing-page-content';
import { Linkedin, Twitter, Instagram } from 'lucide-react';

const socialIcons = {
  LinkedIn: Linkedin,
  Twitter: Twitter,
  Instagram: Instagram,
};

export function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1: Logo & Tagline */}
          <div className="lg:col-span-1">
            <div className="text-2xl font-bold text-gradient mb-4">
              {landingPageContent.footer.company.name.split(' ')[0]}
            </div>
            <p className="text-muted-foreground mb-6">{landingPageContent.footer.tagline}</p>
            <div className="flex gap-4">
              {landingPageContent.footer.social.links.map((social) => {
                const IconComponent =
                  socialIcons[social.platform as keyof typeof socialIcons] || Linkedin;
                return (
                  <Link
                    key={social.platform}
                    href={social.href}
                    className="w-10 h-10 rounded-lg glass border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                    aria-label={social.platform}
                  >
                    <IconComponent className="w-5 h-5" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Column 2: Product Links */}
          <div>
            <h3 className="font-semibold mb-4">{landingPageContent.footer.links.product.title}</h3>
            <ul className="space-y-3">
              {landingPageContent.footer.links.product.items.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company Links */}
          <div>
            <h3 className="font-semibold mb-4">{landingPageContent.footer.links.company.title}</h3>
            <ul className="space-y-3">
              {landingPageContent.footer.links.company.items.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Legal Links */}
          <div>
            <h3 className="font-semibold mb-4">{landingPageContent.footer.links.legal.title}</h3>
            <ul className="space-y-3">
              {landingPageContent.footer.links.legal.items.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            {landingPageContent.footer.copyright}
          </p>
          <p className="text-sm text-muted-foreground">
            {landingPageContent.footer.company.cacNumber}
          </p>
        </div>
      </div>
    </footer>
  );
}
