# Bulut eşitleme kurulumu (Firebase)

Bu adımlar tamamlanınca bilgisayarda ve telefonda **aynı Google hesabıyla** giriş yapan kullanıcı, kayıtlarını
(profil, tahliller, belirtiler, takviyeler, hekim notu) iki cihazda da görür. Değişiklikler birkaç saniye içinde
buluta yazılır; diğer cihaz uygulamaya dönüldüğünde (sekme/uygulama ön plana geldiğinde) güncel hâli çeker.

Kod tarafı hazırdır. Aşağıdaki adımlar **Firebase konsolunda proje sahibi tarafından** yapılmalıdır
(kimlik bilgileri ve proje ayarları kodla otomatik oluşturulamaz).

## 1. Firebase projesi
1. https://console.firebase.google.com adresine projenin sahibi olan Google hesabıyla girin.
2. VitaTakip projesini açın (AI Studio'nun oluşturduğu proje; Firestore veritabanı kimliği
   `ai-studio-android-vitataki-30dafd02-0558-4d73-b7fe-5a4d4b429296`). Proje yoksa yeni proje oluşturun.

## 2. Google ile giriş
**Authentication → Sign-in method → Google → Etkinleştir → Kaydet.**
Destek e-postası olarak kendi adresinizi seçin.

## 3. Web uygulaması (bilgisayar)
1. **Proje ayarları → Genel → Uygulamalarınız → Web (</>) ekle**. Takma ad: `VitaTakip Web`.
2. Gösterilen `firebaseConfig` değerlerini `app/src/main/assets/vita_web/js/firebase-config.js` dosyasına yazın:
   ```js
   window.VITA_FIREBASE_CONFIG = {
     apiKey: "AIza...",
     authDomain: "PROJE-ID.firebaseapp.com",
     projectId: "PROJE-ID",
     appId: "1:...:web:...",
     firestoreDatabaseId: "ai-studio-android-vitataki-30dafd02-0558-4d73-b7fe-5a4d4b429296"
   };
   ```
   Bu değerler gizli değildir; güvenliği `firestore.rules` sağlar.
3. **Authentication → Settings → Authorized domains**: uygulamayı yayınladığınız alan adını ekleyin
   (ör. `vitatakip.netlify.app`). `localhost` varsayılan olarak eklidir.

## 4. Android uygulaması (telefon)
1. **Proje ayarları → Uygulamalarınız → Android ekle**.
   - Paket adı: `com.aistudio.vitatakip.vrkpqm` (Play Store'a yüklemeden önce değiştirilecekse burada da aynısı kullanılmalı)
   - **SHA-1** (test APK'sı için, bu bilgisayardaki `debug.keystore`):
     `D8:C1:E4:15:71:D5:06:1C:E1:FA:3A:81:66:45:45:2C:E6:E7:04:83`
     Play Store sürümü için yükleme anahtarının ve Play App Signing anahtarının SHA-1'leri de ayrıca eklenmelidir.
2. `google-services.json` dosyasını indirip **`app/` klasörüne** koyun (`app/google-services.json`).
3. APK'yı yeniden derleyin: `gradlew assembleDebug`.
   Dosya yoksa uygulama çökmez; yalnızca bulut eşitleme kapalı kalır.

## 5. Güvenlik kurallarını yayınlayın
Proje kökünde:
```
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project PROJE-ID
```
Kurallar: her kullanıcı yalnızca `users/{kendi-uid}/...` altını okuyup yazabilir; diğer her şey kapalıdır.
(Emülatörde doğrulandı: başka hesabın kaydını okuma ve yazma `permission-denied`.)

## 6. Kontrol
1. Bilgisayarda uygulamayı açın → **Bulut Eşitleme → Google ile giriş yap**. Açık rıza sorusunu onaylayın.
2. Bir tahlil girin; üst çubukta "Bulut Eşitlendi ✓" görünür.
3. Telefonda aynı Google hesabıyla giriş yapın → tahlil görünür.

## Nasıl çalışır (özet)
| Konu | Davranış |
|---|---|
| Kimlik | Yalnızca Google'ın doğruladığı Firebase kimliği (uid). Elle e-posta yazarak bağlama kaldırıldı. |
| Veri yeri | `users/{uid}/portal_state/main` → `payloadJson` (en fazla 250.000 karakter) |
| Gönderim | Her kayıttan 2 sn sonra otomatik (art arda değişiklikler birleşir) |
| Alım | Girişte ve uygulamaya/sekmeye dönüldüğünde |
| Çakışma | İki cihazda da farklı değişiklik varsa kullanıcıya sorulur (buluttakini al / bu cihazdakini gönder) |
| Rıza | İlk gönderimden önce KVKK açık rızası; "Bağlantıyı Kes" ile geri alınır, cihazdaki veri silinmez |
| Çıkış | Uygulamadan çıkışta bulut oturumu da kapanır (ortak bilgisayar güvenliği) |
| Yapılandırma yok | Ekranda "Bulut eşitleme etkin değil – yalnızca bu cihaz" yazar; dosya yedeği önerilir |

## Testler
- `tests/bulut-esitleme.mjs` — Firebase emülatörüyle iki cihaz senaryosu (önce
  `npx firebase-tools emulators:start --only auth,firestore --project demo-vitatakip`)
- `tests/bulut-kapali.mjs` — yapılandırma yokken dürüst arayüz ve hesap ele geçirme denemeleri

## Yasal not
Sağlık verisi özel nitelikli kişisel veridir. Firebase sunucuları yurt dışında olabilir; KVKK kapsamında açık
rıza metni ve aydınlatma metni hukukçu tarafından onaylanmalıdır. Uygulama ilk gönderimden önce açık rıza ister.
