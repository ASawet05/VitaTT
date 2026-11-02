/* VitaTakip — Firebase web yapılandırması (bulut eşitleme).
   null bırakılırsa bulut eşitleme kapalıdır; uygulama yalnızca bu cihazda çalışır ve ekranda bu belirtilir.
   Kurulum adımları: docs/BULUT_ESITLEME_KURULUM.md

   Bu değerler gizli değildir (tarayıcıda zaten görünür); verinin güvenliğini firestore.rules sağlar:
   her kullanıcı yalnızca kendi kaydını okuyup yazabilir.
   Analytics bilinçli olarak kullanılmıyor (sağlık uygulaması; izleme yok).
   firestoreDatabaseId verilmezse projenin "(default)" veritabanı kullanılır. */
/* Önceden false atanırsa (ör. test) bulut kapalı kalır. */
window.VITA_FIREBASE_CONFIG = window.VITA_FIREBASE_CONFIG === false ? null : window.VITA_FIREBASE_CONFIG || {
  apiKey: "AIzaSyCvnGY85DNA8LArHFN_8O73gulib5ecCSw",
  authDomain: "vitatakip-6ef7e.firebaseapp.com",
  projectId: "vitatakip-6ef7e",
  storageBucket: "vitatakip-6ef7e.firebasestorage.app",
  messagingSenderId: "213432301211",
  appId: "1:213432301211:web:18b319a690d18ba93cf83e"
};
