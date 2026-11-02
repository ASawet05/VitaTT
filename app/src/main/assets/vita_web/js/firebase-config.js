/* VitaTakip — Firebase web yapılandırması (bulut eşitleme).
   Boş (null) bırakılırsa bulut eşitleme kapalıdır; uygulama yalnızca bu cihazda çalışır ve
   ekranda bu dürüstçe belirtilir. Kurulum adımları: docs/BULUT_ESITLEME_KURULUM.md

   Firebase konsolu > Proje ayarları > Genel > "Uygulamalarınız" > Web uygulaması > SDK yapılandırması
   değerlerini aşağıya kopyalayın. Bu değerler gizli değildir (tarayıcıda zaten görünür); verinin
   güvenliğini firestore.rules sağlar: her kullanıcı yalnızca kendi kaydını okuyup yazabilir.

   Örnek:
   window.VITA_FIREBASE_CONFIG = {
     apiKey: "AIza...",
     authDomain: "PROJE-ID.firebaseapp.com",
     projectId: "PROJE-ID",
     appId: "1:...:web:...",
     firestoreDatabaseId: "ai-studio-android-vitataki-30dafd02-0558-4d73-b7fe-5a4d4b429296"
   };
*/
window.VITA_FIREBASE_CONFIG = window.VITA_FIREBASE_CONFIG || null;
