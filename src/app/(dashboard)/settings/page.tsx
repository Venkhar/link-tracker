import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { Shield, Mail, User } from "lucide-react";
import { ProxySettings } from "@/components/settings/proxy-settings";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  const proxies = await prisma.proxy.findMany({
    orderBy: { createdAt: "desc" },
  });

  const profileContent = (
    <div className="space-y-4">
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b px-6 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Mon profil</h2>
      </div>
      <div className="divide-y">
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 shrink-0">
            <User className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Nom</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">{session.user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 shrink-0">
            <Mail className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">{session.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-6 py-4">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${isAdmin ? "bg-indigo-50" : "bg-gray-100"}`}>
            <Shield className={`h-4 w-4 ${isAdmin ? "text-indigo-500" : "text-gray-500"}`} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Rôle</p>
            <div className="mt-0.5">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                isAdmin ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isAdmin ? "bg-indigo-400" : "bg-gray-400"}`} />
                {isAdmin ? "Administrateur" : "Membre"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <ChangePasswordForm />
    </div>
  );

  const proxyContent = (
    <ProxySettings initialProxies={JSON.parse(JSON.stringify(proxies))} />
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500">Gérez votre profil et la configuration des proxies.</p>
      </div>

      <SettingsTabs
        profileContent={profileContent}
        proxyContent={proxyContent}
        proxyCount={proxies.length}
      />
    </div>
  );
}
