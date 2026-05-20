"use client";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body>
        <main className="shell">
          <div className="ui-card">
            <div className="ui-card-content empty">
              <div>
                <span className="ui-badge">Error</span>
                <h1>Something went wrong</h1>
                <p className="muted">{error.message}</p>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
