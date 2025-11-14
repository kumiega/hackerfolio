import { SettingsContent } from "@/components/page/dashboard/settings-content";
import type { User } from "@/types";

interface SettingsPageProps {
  user: User;
  currentPath: string;
}

export function SettingsPage({ user, currentPath }: SettingsPageProps) {
  return <SettingsContent user={user} />;
}
