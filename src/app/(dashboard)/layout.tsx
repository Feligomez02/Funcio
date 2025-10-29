import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/lib/auth";

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
  const session = await getSession();

  return <AppShell userEmail={session?.user.email}>{children}</AppShell>;
};

export default DashboardLayout;
