import LogoutButton from '@/components/LogoutButton';
import { Toaster } from '@/components/ui/toaster';
import Providers from '@/lib/providers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { PropsWithChildren } from 'react';
import 'three-dots/dist/three-dots.css';
import './globals.css';
import HomeIcon from '@mui/icons-material/Home';

export const metadata = {
  title: 'SPA LLM',
  description: 'GenAI',
};

export default async function RootLayout({ children }: PropsWithChildren) {
  // Keep cookies in the JS execution context for Next.js build
  const cookieStore = cookies();

  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <Providers>
          <div className="flex flex-col items-center h-full">
            <nav className="w-full flex justify-center border-b border-b-foreground/10">
              <div className="max-w-6xl flex grow justify-end items-center text-sm text-foreground">
                <div className="flex flex-row grow">
                  <Link
                    href="/"
                    className="py-4 px-6 cursor-pointer hover:bg-slate-100 font-bold"
                  >
                    <HomeIcon />
                  </Link>
                  {user && (
                    <>
                      <Link
                        href="/files"
                        className="py-4 px-6 cursor-pointer hover:bg-slate-100 font-bold"
                      >
                        Files
                      </Link>
                      <Link
                        href="/chat"
                        className="py-4 px-6 cursor-pointer hover:bg-slate-100 font-bold"
                      >
                        Chat
                      </Link>
                    </>
                  )}
                </div>
                <div className="flex flex-row">
                  {user ? (
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:block">Hey, {user.email}!</div>
                      <LogoutButton />
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      className="py-4 px-6 rounded-md no-underline bg-btn-background hover:bg-btn-background-hover"
                    >
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </nav>
            <main className="w-full grow bg-background flex flex-col items-center h-[calc(100%-5rem)]">
              {children}
            </main>
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  );
}
