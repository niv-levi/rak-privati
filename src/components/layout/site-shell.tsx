import { Footer } from "./footer";
import { Header, type HeaderUser } from "./header";
import { SkipLink } from "./skip-link";

export function SiteShell({ user, children }: { user: HeaderUser; children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <Header user={user} />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
