import { SettingsContent } from "@/components/page/dashboard/settings-content";
import type { User } from "@/types";

interface SettingsPageProps {
  user: User;
}

export function SettingsPage({ user }: SettingsPageProps) {
  return <SettingsContent user={user} />;
}
