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
    <div className="space-y-5">
      <div className="sheet overflow-hidden">
        <div className="border-b border-ink/15 px-6 py-4 flex items-center justify-between">
          <span className="eyebrow">Mon profil</span>
          <span className="mono text-[10px] text-ink-4">/03</span>
        </div>
        <div className="divide-y divide-ink/10">
          <ProfileRow icon={User} label="Nom" value={session.user.name ?? ""} />
          <ProfileRow icon={Mail} label="Email" value={session.user.email ?? ""} mono />
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-paper-deep shrink-0">
              <Shield className={`h-4 w-4 ${isAdmin ? "text-rust" : "text-ink-3"}`} />
            </div>
            <div className="flex-1">
              <p className="eyebrow">Rôle</p>
              <div className="mt-1.5">
                <span className={`inline-flex items-center gap-1.5 rounded-[2px] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${
                  isAdmin ? "bg-signal text-signal-ink" : "bg-paper-deep text-ink-3"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isAdmin ? "bg-signal-ink" : "bg-ink-4"}`} />
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
    <div className="mx-auto max-w-3xl space-y-10">
      <section className="border-b border-ink/20 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="eyebrow">Configuration</span>
          <span className="h-px flex-1 bg-ink/15" />
          <span className="mono text-[10px] text-ink-4 uppercase tracking-wider">
            {session.user.email}
          </span>
        </div>
        <h1 className="font-serif text-[48px] leading-[0.95] tracking-tightest">
          Paramètres <span className="italic font-light">du compte</span>
        </h1>
        <p className="text-sm text-ink-3 mt-3">
          Profil, mot de passe et configuration des proxies utilisés pour les vérifications.
        </p>
      </section>

      <SettingsTabs
        profileContent={profileContent}
        proxyContent={proxyContent}
        proxyCount={proxies.length}
      />
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-paper-deep shrink-0">
        <Icon className="h-4 w-4 text-ink-2" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="eyebrow">{label}</p>
        <p className={`mt-1 text-sm font-medium text-ink truncate ${mono ? "mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
