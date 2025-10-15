import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth.server';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';

export default async function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={session.user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background px-6 pb-6 pt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
