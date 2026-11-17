import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { CoinChip, DmLink } from "@/components/HeaderXir";
import { Settings } from "lucide-react";
import { ProfileMenu } from "@/components/ProfileMenu";

const links = [
  { to: "/", label: "Keşfet" },
  { to: "/animeler", label: "Animeler" },
  { to: "/birlikte-izle", label: "Birlikte İzle" },
  { to: "/takvim", label: "Takvim" },
  { to: "/topluluk", label: "Topluluk" },
] as const;

export function Header() {
  const { isAdmin, userId } = useAuth();
  return (
    <header className="glass fixed inset-x-0 top-0 z-50 border-b border-border">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 md:flex md:gap-4">
        <Link to="/" className="min-w-0 shrink-0 font-display text-xl font-extrabold sm:text-2xl">
          Anime<span className="text-primary">Xir</span>
        </Link>
        <nav className="hidden min-w-0 gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: l.to === "/" }}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}>
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/yonetim" className="rounded-md px-3 py-2 text-sm text-gold" >Yönetim</Link>
          )}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {userId && <CoinChip />}
          {userId && <DmLink />}
          <NotificationBell userId={userId} />
          {userId && (
            <Link to="/ayarlar" aria-label="Ayarlar" className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"><Settings className="h-5 w-5" /></Link>
          )}
          {userId ? (
            <ProfileMenu />
          ) : (
            <Button asChild variant="hero" size="sm"><Link to="/giris">Giriş Yap</Link></Button>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
        {links.map((l) => (
          <Link key={l.to} to={l.to} activeOptions={{ exact: l.to === "/" }}
            className="whitespace-nowrap rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground"
            activeProps={{ className: "text-foreground bg-accent" }}>{l.label}</Link>
        ))}
        {isAdmin && <Link to="/yonetim" className="whitespace-nowrap rounded-full bg-secondary px-3 py-1 text-xs text-gold">Yönetim</Link>}
      </nav>
    </header>
  );
}

export function Avatar({ url, name, size = 36 }: { url?: string | null; name?: string | null; size?: number }) {
  return url ? (
    <img src={url} alt={name ?? ""} style={{ width: size, height: size }} className="rounded-full object-cover ring-2 ring-border" />
  ) : (
    <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
      {(name ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}
