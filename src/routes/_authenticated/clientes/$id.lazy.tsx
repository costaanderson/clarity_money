import { createLazyFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ClientDetail } from "@/components/clients/client-detail";

export const Route = (createLazyFileRoute as unknown as (p: string) => any)(
  "/_authenticated/clientes/$id",
)({
  component: ClientDetailPage,
});

const routeApi = getRouteApi("/_authenticated/clientes/$id");

function ClientDetailPage() {
  const params = routeApi.useParams() as { id: string };
  const navigate = useNavigate();
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/clientes" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Clientes
        </Button>
      </div>
      <ClientDetail id={params.id} />
    </div>
  );
}
