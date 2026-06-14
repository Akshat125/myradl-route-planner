export function Footer() {
  return (
    <footer className="mt-auto border-t border-border pt-4 text-xs text-muted">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>Not affiliated with MyRadl, MVV, MVGO, or Nextbike.</p>
        <nav className="flex items-center gap-4" aria-label="Legal">
          <a
            href="#/impressum"
            className="focus-ring rounded underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Impressum
          </a>
          <a
            href="#/datenschutz"
            className="focus-ring rounded underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Datenschutz
          </a>
        </nav>
      </div>
    </footer>
  )
}
