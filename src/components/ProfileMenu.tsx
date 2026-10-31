import { Link } from "@tanstack/react-router";
import { CalendarClock, Clapperboard, History, ListChecks, LogOut, MessageCircle, Settings, Shield, ShoppingBag, UserCircle, Users } from "lucide-react";
import { cloneElement, type ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Header";
import { UserBadge, UserName } from "@/components/UserName";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Item = { icon: ComponentType<{ className?: string }>; label: string; id: string; link: React.ReactElement };

function Row({ icon: Icon, label, id, link }: Item) {
  return (
    <DropdownMenuItem asChild className="cursor-pointer gap-4 rounded-lg px-4 py-3 text-[15px] font-medium focus:bg-secondary">
      {cloneElement(link, { "data-testid": `profile-menu-${id}`, children: <><Icon className="h-5 w-5 text-muted-foreground" />{label}</> } as never)}
    </DropdownMenuItem>
  );
}

/** Profil fotoğrafına tıklayınca açılan menü. */
export function ProfileMenu() {
  const { userId, profile, isAdmin } = useAuth();
  if (!userId) return null;
  const items: Item[] = [
    { icon: UserCircle, label: "Profil", id: "profile", link: <Link to="/kullanici/$id" params={{ id: userId }} /> },
    { icon: Clapperboard, label: "İzlediklerim", id: "watching", link: <Link to="/profil" search={{ tab: "watching" }} /> },
    { icon: ListChecks, label: "Listem", id: "plan", link: <Link to="/profil" search={{ tab: "plan" }} /> },
    { icon: History, label: "İzleme Geçmişi", id: "history", link: <Link to="/profil" search={{ tab: "history" }} /> },
    { icon: MessageCircle, label: "Mesajlar", id: "messages", link: <Link to="/mesajlar" search={{ to: undefined }} /> },
    { icon: Users, label: "Birlikte İzle", id: "watch-together", link: <Link to="/birlikte-izle" /> },
    { icon: CalendarClock, label: "Yayın Takvimi", id: "calendar", link: <Link to="/takvim" /> },
    { icon: ShoppingBag, label: "Xir Mağaza", id: "shop", link: <Link to="/magaza" /> },
    { icon: Settings, label: "Hesap Ayarları", id: "settings", link: <Link to="/profil" search={{ tab: "edit" }} /> },
  ];
  if (isAdmin) items.push({ icon: Shield, label: "Yönetim", id: "admin", link: <Link to="/yonetim" /> });

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger data-testid="profile-menu-trigger" className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <UserName id={userId} name={profile?.username} className="hidden text-sm sm:inline-flex" />
        <Avatar url={profile?.avatar_url} name={profile?.username} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} data-testid="profile-menu"
        className="w-[min(92vw,22rem)] overflow-hidden rounded-2xl border-border bg-card p-0 shadow-2xl">
        <div className="flex items-center gap-4 bg-background/60 px-5 py-5">
          <Avatar url={profile?.avatar_url} name={profile?.username} size={64} />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold"><UserName id={userId} name={profile?.username} /></p>
            <UserBadge badge={profile?.badge} className="text-xs" />
          </div>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-2">
          {items.map((it) => <Row key={it.id} {...it} />)}
          <DropdownMenuSeparator />
          <DropdownMenuItem data-testid="profile-menu-logout" onSelect={() => supabase.auth.signOut().then(() => location.assign("/"))}
            className="cursor-pointer gap-4 rounded-lg px-4 py-3 text-[15px] font-medium text-primary focus:bg-secondary focus:text-primary">
            <LogOut className="h-5 w-5" /> Çıkış Yap
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
