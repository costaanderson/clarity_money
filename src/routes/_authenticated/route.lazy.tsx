import { createLazyFileRoute, getRouteApi, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Compass, Users, LayoutDashboard, Calendar, CheckSquare, Tag, Bell, Settings, LogOut, KanbanSquare, Gauge, Map, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createLazyFileRoute as any)("/_authenticated")({
  component: AuthedLayout,
});

const routeApi = getRouteApi("/_authenticated");

const nav = [
  { to: "/", label: "Semana", icon: LayoutDashboard, end: true },
  { to: "/clientes", label: "Clientes", icon: Users, end: false },
  { to: "/pipeline", label: "Pipeline", icon: KanbanSquare, end: false },
  { to: "/cockpit", label: "Cockpit", icon: Gauge, end: false },
  { to: "/agenda", label: "Agenda", icon: Calendar, end: false },
  { to: "/tarefas", label: "Tarefas", icon: CheckSquare, end: false },
  { to: "/categorias", label: "Categorias", icon: Tag, end: false },
  { to: "/regras-ativacao", label: "Ativação", icon: Bell, end: false },
  { to: "/estrategia", label: "Estratégia", icon: Map, end: false },
  { to: "/configuracoes", label: "Configurações", icon: Settings, end: false },
] as const;

function AuthedLayout() {
  const { user } = routeApi.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [profileName, setProfileName] = useState<string>(user.email ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.name) setProfileName(data.name);
    });
  }, [user.id]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  const sidebarContent = (
    <>
      <div className="p-5 flex items-center gap-2 border-b">
        <Compass className="h-5 w-5 text-primary" />
        <span className="font-serif text-lg">Bússola</span>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.end }}
            className="block"
            onClick={closeSidebar}
          >
            {({ isActive }) => (
              <span
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t">
        <div className="px-2 py-2 text-xs text-muted-foreground truncate">{profileName}</div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-200 md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <span className="font-serif text-lg">Bússola</span>
          </div>
          <button onClick={closeSidebar} className="text-sidebar-foreground/70 hover:text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.end }}
              className="block"
              onClick={closeSidebar}
            >
              {({ isActive }) => (
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t">
          <div className="px-2 py-2 text-xs text-muted-foreground truncate">{profileName}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-background sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-foreground/70 hover:text-foreground"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <span className="font-serif text-base">Bússola</span>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
