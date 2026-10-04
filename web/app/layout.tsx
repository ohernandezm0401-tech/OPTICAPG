import type {Metadata} from 'next';
import { headers } from 'next/headers';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'OptiSaaS - Gestión de Óptica y Consultorio',
  description: 'SaaS para ópticas con consultorio de optometría (Habilitación, RIPS, INVIMA)',
};

export default async function RootLayout({children}: {children: React.ReactNode}) {
  // El middleware pone el nonce en la petición. Leerlo aquí evita el HTML
  // estático: Next solo estampa el nonce en un render por petición. Sin eso
  // la CSP bloquea la hidratación y el formulario de login se envía en GET.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased min-h-screen">
        <a href="#main-content" className="skip-link">Saltar al contenido principal</a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
