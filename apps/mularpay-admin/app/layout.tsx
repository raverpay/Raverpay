import type { Metadata } from 'next';
import { Inter, Barlow, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/next';

// ============================================
// FONT CONFIGURATION
// Change the font by uncommenting the one you want to use
// ============================================

// Option 1: Geist (Current - Modern, clean)
// const primaryFont = Geist({
//   variable: '--font-primary',
//   subsets: ['latin'],
//   display: 'swap',
// });

const monoFont = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

// // Option 2: Inter (Popular, readable)
const primaryFont = Inter({
  variable: '--font-primary',
  subsets: ['latin'],
  display: 'swap',
});

// // Option 3: Barlow (Bold, modern)
// const primaryFont = Barlow({
//   variable: '--font-primary',
//   subsets: ['latin'],
//   weight: ['300', '400', '500', '600', '700'],
//   display: 'swap',
// });

export const metadata: Metadata = {
  title: 'RaverPay Admin Dashboard',
  description: 'Admin dashboard for RaverPay fintech platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${primaryFont.variable} ${monoFont.variable} font-primary antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster position="top-right" richColors />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
