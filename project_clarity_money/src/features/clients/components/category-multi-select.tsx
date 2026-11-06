import { useState } from "react";
import { Check, ChevronDown, Tags } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";

type Category = { id: string; name: string; color: string };

export function CategoryMultiSelect({
  categories,
  selectedIds,
  onChange,
  placeholder = "Categorias",
}: {
  categories: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedCats = categories.filter((c) => selectedIds.includes(c.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 w-full justify-between font-normal text-left"
          type="button"
        >
          <span className="flex flex-wrap items-center gap-1 min-w-0 overflow-hidden">
            {selectedCats.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedCats.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center text-xs px-1.5 py-0 rounded-full border shrink-0"
                  style={{ borderColor: c.color, color: c.color }}
                >
                  {c.name}
                </span>
              ))
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        {categories.length === 0 ? (
          <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            <Tags className="h-4 w-4" />
            Nenhuma categoria criada ainda.
          </div>
        ) : (
          categories.map((cat) => {
            const selected = selectedIds.includes(cat.id);
            return (
              <div
                key={cat.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted text-sm"
                onClick={() => toggle(cat.id)}
              >
                <div
                  className="h-4 w-4 rounded border flex items-center justify-center shrink-0"
                  style={
                    selected
                      ? { background: cat.color, borderColor: cat.color }
                      : { borderColor: cat.color }
                  }
                >
                  {selected && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="flex-1">{cat.name}</span>
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: cat.color }}
                />
              </div>
            );
          })
        )}
      </PopoverContent>
    </Popover>
  );
}
