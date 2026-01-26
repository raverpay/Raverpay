import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Navbar } from '@/components/layout/Navbar';

const inter = Inter({
  variable: '--font-primary',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RaverPay - Your Gateway to Global Finance',
  description:
    'Simplify how Nigerians interact with money globally. Get dedicated USD, GBP, and EUR accounts, virtual cards, and seamless cross-border payments.',
  keywords: [
    'fintech',
    'Nigeria',
    'virtual cards',
    'international payments',
    'cross-border transfers',
    'banking',
  ],
  openGraph: {
    title: 'RaverPay - Your Gateway to Global Finance',
    description:
      'Simplify how Nigerians interact with money globally. Get dedicated USD, GBP, and EUR accounts, virtual cards, and seamless cross-border payments.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} font-primary antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
