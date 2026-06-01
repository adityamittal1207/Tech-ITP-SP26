import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Users, Calendar } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearch } from "@/hooks/use-studio-data";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data, isFetching } = useSearch(query, open);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const goClient = (id: string) => {
    setOpen(false);
    setQuery("");
    navigate({ to: "/clients", search: { client: id } });
  };

  const goClass = (name: string) => {
    setOpen(false);
    setQuery("");
    navigate({ to: "/analytics", search: { class: name } });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground w-72 hover:bg-muted/50 transition"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Search clients, classes…</span>
        <kbd className="hidden lg:inline text-[10px] bg-muted rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search clients and classes…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {query.length < 2 ? "Type at least 2 characters…" : isFetching ? "Searching…" : "No results found."}
          </CommandEmpty>
          {data?.clients && data.clients.length > 0 && (
            <CommandGroup heading="Clients">
              {data.clients.map((c) => (
                <CommandItem key={c.id} value={c.name} onSelect={() => goClient(c.id)}>
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                  </div>
                  <span className="text-[10px] uppercase text-muted-foreground">{c.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {data?.classes && data.classes.length > 0 && (
            <CommandGroup heading="Classes">
              {data.classes.map((c) => (
                <CommandItem key={c.id} value={c.name} onSelect={() => goClass(c.name)}>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.instructor} · {c.dayOfWeek} {c.time}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
