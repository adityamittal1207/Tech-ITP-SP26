export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
      {label}
    </div>
  );
}

export function PageError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
      {message}
    </div>
  );
}
