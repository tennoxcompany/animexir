import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Database,
  Eye,
  FileText,
  LockKeyhole,
  Printer,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/gizlilik")({
  head: () => ({
    meta: [
      { title: "Gizlilik ve Veri Kullanımı Politikası — AnimeXir" },
      {
        name: "description",
        content:
          "AnimeXir'in veri işleme ilkeleri, saklama süreleri, üçüncü taraf hizmetler ve hesap silme dahil kullanıcı hakları hakkında resmî bilgilendirme.",
      },
      { property: "og:title", content: "Gizlilik ve Veri Kullanımı Politikası — AnimeXir" },
      {
        property: "og:description",
        content:
          "Hangi verilerin neden işlendiğini, kimlerle paylaşıldığını ve hesabın üzerindeki kontrollerini açıkça öğren.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const sections = [
  ["kapsam", "Kapsam ve veri sorumlusu"],
  ["toplanan-veriler", "İşlenen bilgiler"],
  ["kullanim-amaclari", "Kullanım amaçları"],
  ["gorunurluk", "Bilgilerin görünürlüğü"],
  ["ziyaretci-istatistikleri", "Ziyaretçi istatistikleri"],
  ["cerezler", "Çerezler ve yerel depolama"],
  ["ucuncu-taraflar", "Üçüncü taraf hizmetler"],
  ["saklama", "Saklama ve hesap silme"],
  ["guvenlik", "Veri güvenliği"],
  ["haklar", "Hakların ve başvuru"],
  ["degisiklikler", "Politika değişiklikleri"],
] as const;

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border pb-8 last:border-0 last:pb-0">
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-display text-xs font-semibold text-primary">
          {String(number).padStart(2, "0")}
        </span>
        <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <div className="px-4 pb-20 pt-10 sm:pt-14">
      <div className="mx-auto max-w-6xl">
        <header className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-8 sm:px-10 sm:py-10">
          <div className="relative max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Resmî site politikası · Yürürlükte
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
              Gizlilik ve Veri Kullanımı Politikası
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Bu politika, AnimeXir'i kullandığında hangi bilgilerin işlendiğini, bunlara neden ihtiyaç
              duyulduğunu ve hesabınla verilerin üzerindeki kontrollerini açıklar.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Sürüm 1.0
              </span>
              <span>Yürürlük: 11 Kasım 2026</span>
              <span>Son güncelleme: 11 Kasım 2026</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-6"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" /> Yazdır / PDF olarak kaydet
            </Button>
          </div>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav aria-label="Politika içindekiler" className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 px-2 font-display text-xs font-semibold uppercase tracking-wider text-foreground">
                İçindekiler
              </p>
              <ol className="space-y-1">
                {sections.map(([id, title], index) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="flex gap-2 rounded-md px-2 py-1.5 text-xs leading-5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <span className="text-primary">{String(index + 1).padStart(2, "0")}</span>
                      {title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="mt-4 rounded-xl border border-border bg-card p-4 text-xs leading-6 text-muted-foreground">
              <LockKeyhole className="mb-2 h-5 w-5 text-primary" />
              E-posta adresin profil sayfalarında, yorumlarda veya sohbetlerde diğer kullanıcılara gösterilmez.
            </div>
          </aside>

          <main className="rounded-2xl border border-border bg-card p-6 sm:p-8 lg:p-10">
            <div className="mb-10 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Eye, title: "Şeffaf kullanım", text: "Verilerin yalnızca açıklanan amaçlarla işlenir." },
                { icon: Database, title: "Satış yok", text: "Kişisel bilgilerin üçüncü taraflara satılmaz." },
                { icon: UserRoundCheck, title: "Kontrol sende", text: "Hesabını dondurabilir veya kalıcı silebilirsin." },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-xl border border-border bg-background p-4">
                  <Icon className="mb-3 h-5 w-5 text-primary" />
                  <h2 className="font-display text-sm font-semibold">{title}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>

            <div className="space-y-8">
              <Section id="kapsam" number={1} title="Kapsam ve veri sorumlusu">
                <p>
                  Bu politika; AnimeXir internet sitesini, kullanıcı hesaplarını, profil ve topluluk
                  özelliklerini, anime listelerini, izleme ve geri bildirim araçlarını kapsar. Siteyi işleten
                  taraf <strong className="font-medium text-foreground">AnimeXir & Tennox Company</strong>'dir.
                </p>
                <p>
                  Üçüncü taraf bir hizmete yönlendirildiğinde, o hizmetin kendi gizlilik koşulları da geçerli
                  olur. AnimeXir, bu bağımsız hizmetlerin veri uygulamalarını kontrol etmez.
                </p>
              </Section>

              <Section id="toplanan-veriler" number={2} title="İşlenen bilgiler">
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="grid grid-cols-[1fr_1.5fr] bg-secondary px-4 py-3 text-xs font-semibold text-foreground">
                    <span>Veri kategorisi</span>
                    <span>Örnekler</span>
                  </div>
                  {[
                    ["Hesap bilgileri", "E-posta adresi, kimlik doğrulama kayıtları ve Google ile girişte sağlanan temel hesap bilgileri."],
                    ["Profil bilgileri", "Kullanıcı adı, avatar, kapak görseli, hakkımda yazısı ve rozet."],
                    ["Kullanıcı içerikleri", "Yorumlar, puanlar, sohbet mesajları ve geri bildirimler."],
                    ["Kullanım kayıtları", "Anime listeleri, izleme geçmişi, arkadaşlık bağlantıları ve oda etkinlikleri."],
                    ["Teknik bilgiler", "Ziyaret edilen sayfalar, yönlendirme kaynağı, ülke, tarayıcı, cihaz türü, performans ve hata kayıtları."],
                  ].map(([label, text]) => (
                    <div key={label} className="grid grid-cols-[1fr_1.5fr] gap-4 border-t border-border px-4 py-3 text-xs leading-5">
                      <strong className="font-medium text-foreground">{label}</strong>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
                <p>
                  Şifren açık metin olarak saklanmaz; kimlik doğrulama altyapısı tarafından güvenli biçimde
                  işlenir. AnimeXir'de ödeme kartı bilgisi toplanmaz.
                </p>
              </Section>

              <Section id="kullanim-amaclari" number={3} title="Bilgileri kullanma amaçlarımız">
                <ul className="space-y-2">
                  {[
                    "Hesabını oluşturmak, girişini doğrulamak ve oturumunu korumak.",
                    "Profil, liste, yorum, sohbet, arkadaşlık ve birlikte izleme özelliklerini sağlamak.",
                    "Tercihlerini ve izleme geçmişini cihazların arasında kullanılabilir tutmak.",
                    "Spam, kötüye kullanım, yetkisiz erişim ve güvenlik olaylarını önlemek.",
                    "Site performansını, hataları ve kullanıcı memnuniyetini değerlendirerek hizmeti geliştirmek.",
                    "Yürürlükteki hukuki yükümlülükleri yerine getirmek.",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <CheckCircle2 className="mt-1.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  Bu işlemler; hizmetin sağlanması, meşru güvenlik ve geliştirme menfaatleri, hukuki
                  yükümlülükler veya ilgili mevzuatın gerektirdiği durumlarda açık rıza dayanaklarına dayanır.
                  Kişisel verilerin satılmaz veya kiralanmaz.
                </p>
              </Section>

              <Section id="gorunurluk" number={4} title="Bilgilerin diğer kullanıcılar tarafından görünürlüğü">
                <p>
                  Kullanıcı adın, avatarın, kapak görselin, hakkımda yazın ve rozetin profil alanlarında diğer
                  kullanıcılara gösterilebilir. Paylaştığın yorumlar ve sohbet mesajları, bulundukları ortak
                  alanlarda görünür. Arkadaşlık bağlantıların ilgili sosyal özelliklerin çalışması için işlenir.
                </p>
                <p>
                  <strong className="font-medium text-foreground">E-posta adresin diğer kullanıcılara gösterilmez.</strong>{" "}
                  Ortak alanlara yazdığın içeriklere kişisel iletişim bilgilerini veya hassas verilerini eklememen
                  gerekir.
                </p>
              </Section>

              <Section id="ziyaretci-istatistikleri" number={5} title="Ziyaretçi istatistikleri">
                <p>
                  Sitenin nasıl kullanıldığını anlamak için Lovable'ın ziyaretçi istatistikleri kullanılır.
                  Kaydedilenler; ziyaret edilen sayfalar, gelinen kaynak, ülke, tarayıcı, işletim sistemi ve cihaz
                  türü, sitede kalma süresi, sayfa yüklenme hızı, hatalar ve tıklanan düğme veya bağlantılardır.
                  Tıklamalar, sayfadaki konuma göre kaydedilir; düğmenin veya bağlantının metnine göre kaydedilmez.
                </p>
                <p>
                  Sayfa ziyaretleri, sayfada kalma süresi, sayfa hızı, hatalar ve tıklamalar her ziyaretçi için
                  kaydedilir. Bu istatistikler çerez kullanmaz, cihazında veri saklamaz, IP adresini tutmaz ve
                  ziyaretçinin kimliğini belirlemez. Ayrıntılı veriler 90 gün, günlük özetler bir yıl saklanır.
                </p>
                <p>
                  Bu verileri bizim için Lovable toplar.{" "}
                  <a
                    href="https://lovable.dev/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
                  >
                    Lovable'ın gizlilik politikası <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>{" "}
                  verileri nasıl işlediğini açıklar.
                </p>
              </Section>

              <Section id="cerezler" number={6} title="Çerezler ve cihazında saklanan bilgiler">
                <p>
                  Lovable'ın ziyaretçi istatistikleri çerez kullanmaz ve cihazında veri saklamaz. Buna karşılık,
                  giriş yapmış kalman için oturum bilgileri ve tema gibi bazı tercihler tarayıcının yerel
                  depolama alanında tutulur. Tarayıcı ayarlarından bu kayıtları silebilirsin; oturum kayıtlarını
                  silmen oturumunu kapatabilir.
                </p>
                <p>
                  Video oynatıcılar, yazı tipleri veya giriş sağlayıcıları gibi üçüncü taraf hizmetler kendi
                  çerezlerini veya benzer teknolojilerini kullanabilir. Bunlar AnimeXir'in yerel tercihleriyle aynı
                  kapsamda değildir ve ilgili sağlayıcının kurallarına tabidir.
                </p>
              </Section>

              <Section id="ucuncu-taraflar" number={7} title="Üçüncü taraf hizmetler ve veri alıcıları">
                <div className="space-y-3">
                  {[
                    ["Lovable Cloud", "Site barındırma, veritabanı, kimlik doğrulama, hata raporlama ve ziyaretçi istatistikleri altyapısını sağlar. Hizmetin çalışması için gerekli hesap, içerik ve teknik verileri işler."],
                    ["Google ile giriş", "Google ile girişi seçtiğinde kimliğini doğrulamak için Google'dan temel hesap bilgileri alınır. Google'ın kendi veri işleme koşulları geçerlidir."],
                    ["Vidnest video oynatıcı", "Bir bölümü izlediğinde video üçüncü taraf oynatıcıdan yüklenir. Oynatıcı teknik bağlantı bilgilerini alabilir ve kendi çerezleri ile reklamlarını kullanabilir."],
                    ["Google Fonts", "Sitedeki yazı tiplerini yüklemek için tarayıcın Google sunucularına bağlanabilir; bu bağlantı sırasında standart teknik istek bilgileri iletilir."],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-xl border border-border bg-background p-4">
                      <h3 className="mb-1 font-display text-sm font-semibold text-foreground">{title}</h3>
                      <p className="text-xs leading-6">{text}</p>
                    </div>
                  ))}
                </div>
                <p>
                  Bu sağlayıcıların sunucuları farklı ülkelerde bulunabilir. Veriler, hizmetin gerektirdiği ölçüde
                  ve ilgili sağlayıcının güvenceleriyle yurt dışında da işlenebilir. Ayrıca kanunen yetkili
                  makamlardan geçerli bir talep gelmesi hâlinde gerekli bilgiler paylaşılabilir.
                </p>
              </Section>

              <Section id="saklama" number={8} title="Saklama süresi, hesap dondurma ve silme">
                <p>
                  Hesap ve kullanım verileri, hesabın etkin olduğu sürece ve hizmetin sağlanması için gerekli
                  oldukları ölçüde saklanır. Güvenlik kayıtları ile ziyaretçi istatistikleri, ilgili hizmetin
                  kendi saklama sürelerine tabidir. Lovable istatistiklerinde ayrıntılı veriler 90 gün, günlük
                  özetler bir yıl tutulur.
                </p>
                <p>
                  <Link to="/ayarlar" className="text-primary underline underline-offset-4">Ayarlar → Hesap</Link>{" "}
                  bölümünden hesabını dondurabilirsin. Dondurulan profilin başkalarına gösterilmez; tekrar giriş
                  yaptığında hesabın yeniden açılır.
                </p>
                <p>
                  Aynı bölümden hesabını kalıcı olarak silebilirsin. Hesap silme işlemi geri alınamaz. Silme
                  sonrasında hesabın ve bağlı kayıtların kaldırılması hedeflenir; hukuki yükümlülük, güvenlik veya
                  uyuşmazlık çözümü için ayrıca tutulması zorunlu olan sınırlı kayıtlar varsa yalnızca gerekli süre
                  boyunca saklanır.
                </p>
              </Section>

              <Section id="guvenlik" number={9} title="Veri güvenliği">
                <p>
                  Hesap ve içerik tablolarında erişim kuralları kullanılır; şifreler kimlik doğrulama altyapısı
                  tarafından korunur ve yönetici yetkileri sunucu tarafında doğrulanır. Bilgilerin yalnızca ilgili
                  özelliğin çalışması için gerekli kişi ve sistemlerce işlenmesi amaçlanır.
                </p>
                <p>
                  İnternet üzerinden yapılan hiçbir aktarımın veya depolamanın mutlak güvenli olduğu garanti
                  edilemez. Hesabını korumak için güçlü ve benzersiz bir şifre kullanmalı, oturum bilgilerini
                  kimseyle paylaşmamalısın.
                </p>
              </Section>

              <Section id="haklar" number={10} title="Hakların ve gizlilik başvuruları">
                <p>
                  Yürürlükteki veri koruma mevzuatının tanıdığı ölçüde; verilerine erişme, düzeltilmesini veya
                  silinmesini isteme, işlemeye itiraz etme ve veri işleme hakkında bilgi alma haklarına sahip
                  olabilirsin. Profil bilgilerinin bir bölümünü doğrudan Ayarlar sayfasından güncelleyebilirsin.
                </p>
                <p>
                  Diğer talepler için giriş yaparak{" "}
                  <Link to="/geri-bildirim" className="text-primary underline underline-offset-4">Geri Bildirim</Link>{" "}
                  sayfasında mesajının başına <strong className="font-medium text-foreground">“Gizlilik Talebi”</strong>{" "}
                  yazabilirsin. Hesabın güvenliği için talebin ilgili hesaba ait oturumdan gönderilmesi ve ek
                  kimlik doğrulaması gerekebilir. Başvurular, yürürlükteki mevzuatın öngördüğü süre içinde
                  değerlendirilir.
                </p>
              </Section>

              <Section id="degisiklikler" number={11} title="Politika değişiklikleri">
                <p>
                  Site özelliklerinin, kullanılan hizmetlerin veya hukuki gerekliliklerin değişmesi hâlinde bu
                  politika güncellenebilir. Yeni metin bu sayfada yayımlandığı tarihte yürürlüğe girer; sürüm ve
                  son güncelleme tarihi sayfanın başında gösterilir. Önemli değişikliklerde ayrıca site içinde
                  bilgilendirme yapılabilir.
                </p>
              </Section>
            </div>

            <div className="mt-10 rounded-xl border border-primary/25 bg-primary/5 p-5">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h2 className="font-display text-sm font-semibold">Hesabını yönetmek ister misin?</h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    Profilini düzenleyebilir, hesabını dondurabilir veya kalıcı silme işlemini başlatabilirsin.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link to="/ayarlar">Ayarları aç</Link>
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
