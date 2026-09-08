import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Levantamientos',
  icons: { icon: '/favicon.png' },
  description: 'Registro de levantamientos por ramal, circuitos y subestación con geolocalización, podas y cuadrillas.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}

