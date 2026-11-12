import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { footerNav, siteConfig } from "@/lib/config/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{siteConfig.tagline}</p>
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              הפלטפורמה מיועדת למכירת רכבים פרטיים בין אנשים פרטיים בלבד. פרסום על ידי סוחרים, מגרשים או עסקים אסור.
            </p>
          </div>
          {footerNav.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="mb-3 text-sm font-bold text-brand-dark">{group.title}</h2>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-brand-dark hover:underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <span className="num">{new Date().getFullYear()}</span> {siteConfig.name}. כל הזכויות שמורות.
          </p>
          <p>
            המידע על רכבים מבוסס על המקורות הזמינים ואינו מהווה בדיקה מכנית, משפטית או אישור שהרכב תקין.{" "}
            <Link href="/data-sources" className="underline underline-offset-4 hover:text-brand-dark">
              מקורות המידע
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
