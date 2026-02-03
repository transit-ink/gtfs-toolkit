import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Outlet } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { useChangeset } from "@/context/ChangesetContext"
import { AppSidebar } from "./app-sidebar"
import { ChangesetPanel } from "./ChangesetPanel"

export function Layout() {
  const { isAuthenticated } = useAuth();
  const { isContributorUser, hasChanges } = useChangeset();

  if (!isAuthenticated) {
    // Layout without sidebar for unauthenticated users
    return (
      <div className="min-h-screen">
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    );
  }

  // Layout with sidebar for authenticated users
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
          {/* Show changeset indicator in header for contributors */}
          {isContributorUser && hasChanges && (
            <div className="text-sm text-muted-foreground">
              You have unsaved changes
            </div>
          )}
        </header>
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-auto p-4">
            <Outlet />
          </main>
          {/* Show changeset panel for contributors */}
          {isContributorUser && (
            <aside className="w-80 border-l p-4 overflow-auto hidden lg:block">
              <ChangesetPanel />
            </aside>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
