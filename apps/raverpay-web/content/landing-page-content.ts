/**
 * Centralized content for RaverPay Landing Page
 * All text content is stored here for easy management and updates
 */

export const landingPageContent = {
  // Navigation
  nav: {
    logo: 'RaverPay',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Security', href: '#security' },
      { label: 'About', href: '#about' },
    ],
    cta: 'Get Started',
  },

  // Hero Section
  hero: {
    headline: 'Your Gateway to Global Finance',
    subheadline:
      'Simplify how Nigerians interact with money globally. Get dedicated USD, GBP, and EUR accounts, virtual cards, and seamless cross-border payments—all in one platform.',
    primaryCta: 'Get Started Free',
    secondaryCta: 'See How It Works',
    trustIndicators: {
      cacRegistered: 'CAC Registered',
      usersCount: '50,000+ Nigerians',
    },
  },

  // Social Proof Section
  socialProof: {
    stats: [
      { label: '50K+ Users', value: '50000' },
      { label: '₦2B+ Processed', value: '2000000000' },
      { label: '150+ Countries', value: '150' },
    ],
  },

  // Features Section
  features: {
    title: 'Everything You Need for Global Finance',
    subtitle: 'Built specifically for Nigerian freelancers, creators, and entrepreneurs',
    items: [
      {
        id: 'international-accounts',
        icon: 'Globe',
        title: 'Global Bank Accounts',
        description:
          'Receive payments from anywhere. Get dedicated USD, GBP, EUR account numbers for seamless international transactions.',
        linkText: 'Learn More',
      },
      {
        id: 'virtual-cards',
        icon: 'CreditCard',
        title: 'Multi-Currency Virtual Cards',
        description:
          'Create instant virtual dollar, pound, and euro cards for online shopping, subscriptions, and global payments.',
        linkText: 'Learn More',
      },
      {
        id: 'stablecoin',
        icon: 'Coins',
        title: 'Stablecoin Transactions',
        description:
          'Send and receive stablecoin payments with instant settlement and low fees across African countries.',
        linkText: 'Learn More',
      },
      {
        id: 'cross-border',
        icon: 'ArrowLeftRight',
        title: 'Instant African Transfers',
        description:
          'Send money across African countries instantly with competitive rates and transparent fees.',
        linkText: 'Learn More',
      },
      {
        id: 'bill-payments',
        icon: 'Zap',
        title: 'Seamless Bill Payments',
        description:
          'Pay for airtime, data, electricity, and cable subscriptions in seconds. All in one place.',
        linkText: 'Learn More',
      },
      {
        id: 'creator-tools',
        icon: 'Users',
        title: 'Built for Creators & Freelancers',
        description:
          'Designed specifically for Nigerian freelancers and creators to receive and manage global payments effortlessly.',
        linkText: 'Learn More',
      },
    ],
  },

  // How It Works Section
  howItWorks: {
    title: 'How It Works',
    subtitle: 'Get started in minutes',
    steps: [
      {
        number: '01',
        title: 'Sign Up in Minutes',
        description: 'Create your free account with just your phone number',
        icon: 'UserPlus',
      },
      {
        number: '02',
        title: 'Choose Your Service',
        description: 'Select from virtual cards, bank accounts, or transfers',
        icon: 'Settings',
      },
      {
        number: '03',
        title: 'Start Transacting',
        description: 'Send, receive, and manage money globally',
        icon: 'Rocket',
      },
    ],
  },

  // App Showcase Section
  appShowcase: {
    title: 'Banking Without Borders',
    subtitle: 'Manage your global finances on the go',
    description:
      'Access your accounts, cards, and transactions from anywhere. Our mobile-first platform puts global finance at your fingertips.',
    downloadButtons: {
      appStore: {
        label: 'Download on App Store',
        href: '#',
        available: false, // Set to true when app is available
      },
      googlePlay: {
        label: 'Get it on Google Play',
        href: '#',
        available: false, // Set to true when app is available
      },
    },
    comingSoon: 'Coming Soon',
    waitlistCta: 'Join Waitlist',
  },

  // Security Section
  security: {
    title: 'Your Money, Secured',
    subtitle: 'Enterprise-grade security for your peace of mind',
    features: [
      {
        icon: 'Lock',
        title: 'Bank-Level Encryption',
        description: 'All transactions are protected with military-grade encryption',
      },
      {
        icon: 'Shield',
        title: 'Two-Factor Authentication',
        description: 'Add an extra layer of security to your account',
      },
      {
        icon: 'CheckCircle',
        title: 'CAC Registered & Compliant',
        description: 'Fully licensed and regulated by Nigerian authorities',
      },
      {
        icon: 'Eye',
        title: '24/7 Fraud Monitoring',
        description: 'Advanced AI-powered fraud detection keeps your account safe',
      },
    ],
  },

  // Stats Section
  stats: {
    items: [
      {
        value: '50000',
        label: 'Active Users',
        suffix: '+',
        icon: 'Users',
      },
      {
        value: '2000000000',
        label: 'Processed Monthly',
        prefix: '₦',
        suffix: '+',
        icon: 'TrendingUp',
      },
      {
        value: '4.8',
        label: 'User Rating',
        suffix: '★',
        icon: 'Star',
      },
      {
        value: '150',
        label: 'Countries Connected',
        suffix: '+',
        icon: 'Globe',
      },
    ],
  },

  // Testimonials Section (Optional)
  testimonials: {
    title: 'Trusted by Thousands',
    subtitle: 'See what our users are saying',
    items: [
      {
        name: 'Chinwe Okafor',
        role: 'Freelance Designer',
        content:
          'RaverPay has completely transformed how I receive payments from international clients. The virtual cards are a game-changer!',
        rating: 5,
      },
      {
        name: 'Emeka Adeyemi',
        role: 'Content Creator',
        content:
          'Getting paid in dollars and converting to naira instantly has never been easier. Highly recommend!',
        rating: 5,
      },
      {
        name: 'Amina Hassan',
        role: 'E-commerce Entrepreneur',
        content:
          'The cross-border transfer feature saved me so much time and money. RaverPay is the future of fintech in Nigeria.',
        rating: 5,
      },
    ],
  },

  // Final CTA Section
  finalCta: {
    headline: 'Ready to Go Global?',
    subtext: 'Join thousands of Nigerians managing their global finances with RaverPay',
    buttonText: 'Create Free Account',
  },

  // Footer
  footer: {
    tagline: 'Simplify how Nigerians interact with money globally',
    company: {
      name: 'RaverPay Financial Technology Limited',
      cacNumber: 'CAC Registered',
    },
    links: {
      product: {
        title: 'Product',
        items: [
          { label: 'Features', href: '#features' },
          { label: 'Pricing', href: '#pricing' },
          { label: 'How It Works', href: '#how-it-works' },
        ],
      },
      company: {
        title: 'Company',
        items: [
          { label: 'About Us', href: '#about' },
          { label: 'Careers', href: '#careers' },
          { label: 'Blog', href: '#blog' },
          { label: 'Contact', href: '#contact' },
        ],
      },
      legal: {
        title: 'Legal',
        items: [
          { label: 'Privacy Policy', href: '#privacy' },
          { label: 'Terms of Service', href: '#terms' },
          { label: 'Security', href: '#security' },
        ],
      },
    },
    social: {
      title: 'Follow Us',
      links: [
        { platform: 'LinkedIn', href: '#' },
        { platform: 'Twitter', href: '#' },
        { platform: 'Instagram', href: '#' },
      ],
    },
    copyright: `Copyright © ${new Date().getFullYear()} RaverPay Financial Technology Limited. All Rights Reserved.`,
  },
} as const;
