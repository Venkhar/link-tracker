import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-paper">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-[1440px] fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
