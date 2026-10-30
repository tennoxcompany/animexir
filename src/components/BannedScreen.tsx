import { Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function BannedScreen() {
  return (
    <div data-testid="banned-screen" className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <Ban className="mx-auto h-14 w-14 text-primary" />
        <h1 className="mt-4 text-3xl font-bold">Hesabın yasaklandı</h1>
        <p className="mt-2 text-sm text-muted-foreground">Bu hesap kurallara uymadığı için AnimeXir'i artık kullanamaz.</p>
        <Button data-testid="banned-logout" variant="outline" className="mt-6" onClick={() => supabase.auth.signOut().then(() => location.assign("/"))}>
          Çıkış yap
        </Button>
      </div>
    </div>
  );
}
