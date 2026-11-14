"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ fontFamily: "Heebo, system-ui, sans-serif", background: "#F5F5F0", color: "#202A2B", margin: 0 }}>
        <main style={{ maxWidth: 560, margin: "15vh auto", padding: 24, textAlign: "center" }}>
          <h1 style={{ color: "#18383B" }}>משהו השתבש</h1>
          <p style={{ color: "#647274" }}>אירעה שגיאה כללית באפליקציה. נסו לרענן את הדף.</p>
          {error.digest && <p style={{ fontSize: 12, color: "#647274" }} dir="ltr">{error.digest}</p>}
          <button onClick={reset} style={{ background: "#16454A", color: "#fff", border: 0, borderRadius: 12, padding: "12px 24px", fontWeight: 700, cursor: "pointer" }}>
            נסו שוב
          </button>
        </main>
      </body>
    </html>
  );
}
