import { createLazyFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createLazyFileRoute as any)("/_authenticated/estrategia")({
  component: EstrategiaPage,
});

function EstrategiaPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const focusIframe = () => {
    iframeRef.current?.contentWindow?.focus();
  };

  const nav = (dir: "next" | "prev") => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const key = dir === "next" ? "ArrowRight" : "ArrowLeft";
    doc.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-1px)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-3 border-b">
        <div>
          <h1 className="text-lg font-semibold">Planejamento Estratégico</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Use as setas ou os botões para navegar entre os slides</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => nav("prev")}>
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => nav("next")}>
            <span className="hidden sm:inline">Próximo</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/estrategia.html" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Abrir em nova aba</span>
            </a>
          </Button>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        src="/estrategia.html"
        title="Planejamento Estratégico"
        className="flex-1 w-full border-0"
        onLoad={focusIframe}
        onMouseEnter={focusIframe}
      />
    </div>
  );
}
