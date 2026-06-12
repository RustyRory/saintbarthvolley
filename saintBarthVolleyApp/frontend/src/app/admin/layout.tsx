"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/auth";

import { AppSidebar } from "@/components/dashboard/admin/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/admin/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [isChecking, setIsChecking] = React.useState(true);
  const [isAllowed, setIsAllowed] = React.useState(false);

  React.useEffect(() => {
    authApi
      .me()
      .then((user) => {
        if (user.role === "admin" || user.role === "editor") {
          setIsAllowed(true);
        } else {
          router.replace("/");
        }
      })
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => {
        setIsChecking(false);
      });
  }, [router]);

  // 🔒 BLOQUE TOUT
  if (isChecking || !isAllowed) {
    return null; // 🔥 pas de flash
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "260px",
          "--header-height": "60px",
        } as React.CSSProperties
      }
    >
      <AppSidebar />

      <SidebarInset>
        <DashboardHeader />

        <main className="flex flex-1 flex-col bg-muted/40 p-4 md:p-6 min-h-[calc(100vh-60px)]">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
