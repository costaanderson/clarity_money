import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ClientDetail } from "./client-detail";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function ClientDetailSheet({
  clientId,
  open,
  onOpenChange,
}: {
  clientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-4xl p-0 overflow-hidden flex flex-col gap-0"
      >
        <SheetHeader className="px-6 pt-6 pb-3 border-b bg-muted/30 flex-row items-center justify-between space-y-0 shrink-0">
          <SheetTitle className="font-serif text-base text-muted-foreground font-normal">
            Detalhes do cliente
          </SheetTitle>
          {clientId && (
            <Button variant="ghost" size="sm" className="mr-8" asChild>
              <Link to="/clientes/$id" params={{ id: clientId }} onClick={() => onOpenChange(false)}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir página cheia
              </Link>
            </Button>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {clientId && <ClientDetail id={clientId} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
