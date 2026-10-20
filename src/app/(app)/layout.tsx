import { AppShell } from "@/components/app-shell";
import { getProfile } from "@/lib/data";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { username } = await getProfile();
  return <AppShell username={username}>{children}</AppShell>;
}
