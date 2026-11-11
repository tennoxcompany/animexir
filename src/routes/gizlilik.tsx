import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/gizlilik")({
  head: () => ({
    meta: [
      { title: "Gizlilik Politikası — AnimeXir" },
      { name: "description", content: "AnimeXir'in hangi bilgileri topladığı, nasıl kullandığı ve hesabını nasıl silebileceğin." },
      { property: "og:title", content: "Gizlilik Politikası — AnimeXir" },
      { property: "og:description", content: "AnimeXir gizlilik politikası ve kullanıcı hakları." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function S({ t, children }: { t: string; children: React.ReactNode }) {
  return <section className="space-y-2"><h2 className="text-xl font-semibold">{t}</h2><div className="space-y-2 text-muted-foreground">{children}</div></section>;
}

function Page() {
  return (
    <div className="container mx-auto max-w-3xl space-y-8 px-4 py-10">
      <h1 className="text-3xl font-bold">Gizlilik Politikası</h1>
      <p className="text-sm text-muted-foreground">Son güncelleme: 11 Kasım 2026</p>
      <S t="Topladığımız bilgiler">
        <p>Kayıt olurken e-posta adresin ve şifren (şifrelenmiş olarak) ya da Google hesabınla girişte Google'ın verdiği temel bilgiler.</p>
        <p>Profilinde girdiğin kullanıcı adı, avatar, afiş, hakkımda yazısı ve rozet; yorumların, puanların, sohbet mesajların, anime listelerin, izleme geçmişin, arkadaşlıkların ve gönderdiğin geri bildirimler.</p>
        <p>E-posta adresin hiçbir zaman diğer kullanıcılara gösterilmez.</p>
      </S>
      <S t="Ziyaretçi istatistikleri">
        <p>Sitenin nasıl kullanıldığını görmek için Lovable'ın ziyaretçi istatistikleri kullanılır: ziyaret edilen sayfalar, nereden gelindiği, ülke, tarayıcı, işletim sistemi, cihaz türü, sayfada kalma süresi, sayfa hızı, hatalar ve tıklamalar kaydedilir.</p>
        <p>Bu istatistik çerez kullanmaz, cihazına bir şey kaydetmez, IP adresini saklamaz ve seni tanımlamaz. Ayrıntılı veriler 90 gün, günlük özetler bir yıl tutulur. Bu verileri bizim için Lovable toplar. <a className="underline" href="https://lovable.dev/privacy" target="_blank" rel="noreferrer">Lovable'ın gizlilik politikası</a> bunları nasıl işlediğini anlatır.</p>
      </S>
      <S t="Cihazında saklananlar">
        <p>Giriş yapmış kalman için oturum bilgin ve bazı tercihlerin (ör. tema) tarayıcının yerel deposunda tutulur.</p>
      </S>
      <S t="Dış oynatıcılar">
        <p>Videolar üçüncü taraf oynatıcılardan (ör. Vidnest) gösterilir. Bu oynatıcılar kendi çerezlerini ve reklamlarını kullanabilir; bunlar onların kendi kurallarına tabidir.</p>
      </S>
      <S t="Bilgilerin nasıl kullanılır">
        <p>Yalnızca siteyi çalıştırmak için: hesabını yönetmek, listelerini ve sohbetlerini göstermek, kötüye kullanımı önlemek. Bilgilerini satmayız.</p>
      </S>
      <S t="Hakların">
        <p>Profilim → Düzenle bölümünden hesabını dondurabilir veya kalıcı olarak silebilirsin. Silme işleminde hesabın ve sana bağlı bilgiler kaldırılır.</p>
      </S>
    </div>
  );
}
