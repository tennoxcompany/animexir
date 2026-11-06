# "Disable sandbox" hatasını düzelt

## Sorun
Vidnest, oynatıcının etrafındaki güvenlik kilidini (reklam pencerelerini engelleyen kilit) fark edince videoyu oynatmayı reddediyor ve "disable sandbox" hatası veriyor.

## Gerçek durum
Vidnest'in içine dışarıdan müdahale edemiyoruz. Ya kilit takılı kalır (reklam yok ama Vidnest bazı cihazlarda oynatmaz) ya da kilit kalkar (video oynar ama tuşlara basınca reklam sekmesi açılabilir). Videonun kaynağı Vidnest'te olduğu için kendi oynatıcımızı yapmak mümkün değil.

## Yapılacak
- Oynatıcıdaki güvenlik kilidini kaldır, böylece herkeste video oynasın.
- Reklam sekmesi açılırsa ne yapılacağını anlatan kısa bir not ekle: "Reklam sekmesi açılırsa kapatıp geri dön, video devam eder."
- Elle eklenmiş mp4 linkleri olduğu gibi kalsın.

## Teknik
- `src/components/VideoPlayer.tsx`: EmbedPlayer iframe'inden `sandbox={PLAYER_SANDBOX}` kaldırılır, ilgili yorum güncellenir.

## Ayrıca (GitHub isteği)
Lovable var olan tennoxcompany/animexir deposuna bağlanamıyor. Seçenekler: Ayarlar → Git'ten yeni depo bağlamak (otomatik senkron) ya da kodu indirip o depoya kendin yüklemek.
