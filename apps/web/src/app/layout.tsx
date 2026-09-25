import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/layout/Providers';

export const metadata: Metadata = {
  title: 'CargoFlow — 3D Truck & Trailer Load Planning',
  description: 'Enterprise 3D cargo load planning and real-time logistics optimization.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read runtime environment variables supplied by Cloudflare Workers at runtime
  const runtimeApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
  const runtimeWsUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.WS_URL || '';

  return (
    <html lang="en" className="h-full">
      <head>
        {(runtimeApiUrl || runtimeWsUrl) && (
          <script
            id="__CARGOFLOW_CONFIG__"
            dangerouslySetInnerHTML={{
              __html: `window.__CARGOFLOW_CONFIG__ = ${JSON.stringify({
                apiUrl: runtimeApiUrl,
                wsUrl: runtimeWsUrl,
              })};`,
            }}
          />
        )}
      </head>
      <body className="h-full bg-slate-50 text-slate-900 font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

