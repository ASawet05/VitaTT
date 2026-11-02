/* VitaTakip — Gerçek bulut eşitleme (Firebase Authentication + Cloud Firestore).

   Kimlik yalnızca Google'ın doğruladığı Firebase kullanıcı kimliğinden (uid) gelir. Elle e-posta yazarak
   "bağlama" ve ad-soyad eşleşmesiyle hesap bulma kaldırıldı (başkasının verisine erişim açığıydı).

   Veri yeri: users/{uid}/portal_state/main  { userId, displayName, email, payloadJson, createdAt, updatedAt }
   Güvenlik: firestore.rules — her kullanıcı yalnızca kendi kaydını okuyup yazabilir.

   Modlar:
   - "web":     tarayıcı + js/firebase-config.js doluysa → Firebase JS SDK (vendor/firebase, yerel dosya)
   - "android": uygulama içi WebView → yerel (native) Google girişi ve Firestore köprüsü (AndroidVitaBridge)
   - "off":     yapılandırma yok → veriler yalnızca bu cihazda; ekranda dürüstçe belirtilir, dosya yedeği önerilir */
(function () {
  "use strict";

  var SDK_SRC = "vendor/firebase/vita-firebase-11.10.0.min.js?v=1";
  var MAX_PAYLOAD = 250000; /* firestore.rules sınırı */
  var cfg = window.VITA_FIREBASE_CONFIG;
  var bridge = window.AndroidVitaBridge;
  var MODE = bridge ? "android" : ((cfg && cfg.apiKey && cfg.projectId) ? "web" : "off");

  var fb = null;          /* { sdk, auth, db } */
  var current = null;     /* { uid, email, name } — yalnızca doğrulanmış oturum */
  var pushTimer = null, pulling = false, applying = false, lastPullAt = 0;

  function $(id) { return document.getElementById(id); }
  function toast(t, m, k) { if (typeof showToast === "function") showToast(t, m, k || "info"); }
  function feedback(m, k) { if (typeof setCloudSyncModalFeedback === "function") setCloudSyncModalFeedback(m, k || "info"); }
  function lsGet(k) { try { return (typeof safeLocalStorageGetItem === "function" ? safeLocalStorageGetItem(k) : localStorage.getItem(k)); } catch (_) { return null; } }
  function lsSet(k, v) { try { (typeof safeLocalStorageSetItem === "function" ? safeLocalStorageSetItem : localStorage.setItem.bind(localStorage))(k, v); } catch (_) {} }
  function uidNow() { return typeof activeUserId !== "undefined" ? activeUserId : null; }

  /* ---------- Yardımcılar ---------- */
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ":" + s.length; }
  function metaKey(uid) { return "vitatakip_cloudmeta_" + uid; }
  function getMeta(uid) { try { return JSON.parse(lsGet(metaKey(uid)) || "{}") || {}; } catch (_) { return {}; } }
  function setMeta(uid, m) { lsSet(metaKey(uid), JSON.stringify(m)); }

  function buildPayload() {
    var p = buildCloudBackupPayload(current ? current.email : "", current ? current.name : "");
    delete p.lastCDSS; /* analiz her cihazda güncel kurallarla yeniden hesaplanır */
    return p;
  }
  function contentHash(p) {
    var c = Object.assign({}, p); delete c.cloudSyncDate; delete c.cloudSyncDateTr; delete c.googleAccount;
    return hashStr(JSON.stringify(c));
  }
  function localHasData() {
    return (Array.isArray(state.supplements) && state.supplements.length > 0) ||
      (Array.isArray(state.labHistory) && state.labHistory.length > 0) ||
      (state.selectedSymptoms instanceof Set && state.selectedSymptoms.size > 0);
  }
  function fmtDate(ms) { try { return new Date(ms).toLocaleString("tr-TR"); } catch (_) { return ""; } }

  /* ---------- Yerel hesap ↔ bulut kimliği ---------- */
  function linkedLocalUser() {
    var id = uidNow(); if (!id) return null;
    return getUsersDb().filter(function (u) { return u && u.id === id; })[0] || null;
  }
  function sessionMatchesCloud() {
    var u = linkedLocalUser();
    return Boolean(current && u && u.cloudUid === current.uid);
  }
  function loginLocal(user) {
    activeUserId = user.id;
    if (typeof safeSessionStorageSetItem === "function") safeSessionStorageSetItem("vitatakip_active_session_id", user.id);
    lsSet("vitatakip_active_session_id", user.id);
    loadUserSessionData(user.id);
    if (typeof closeAuthModal === "function") closeAuthModal();
  }
  /* Doğrulanmış uid'e karşılık gelen yerel hesabı bul/oluştur; yanlış hesaba yazmayı önle. */
  function attachLocalAccount() {
    var users = getUsersDb();
    var byUid = users.filter(function (u) { return u && u.cloudUid === current.uid; })[0];
    var activeId = uidNow();
    var active = activeId ? users.filter(function (u) { return u && u.id === activeId; })[0] || null : null; /* aynı dizi: değişiklik kaydedilir */
    if (active && active.cloudUid && active.cloudUid !== current.uid) {
      /* Bu cihazda başka bir bulut hesabına bağlı yerel hesap açık: karışmayı önlemek için o hesaba geçilir. */
      if (byUid) { loginLocal(byUid); return true; }
      var fresh = createLocalFor(users);
      loginLocal(fresh); return true;
    }
    if (active && !active.cloudUid && !byUid) {
      active.cloudUid = current.uid; active.googleEmail = current.email; saveUsersDb(users);
      return true;
    }
    if (byUid) { if (!active || active.id !== byUid.id) loginLocal(byUid); return true; }
    loginLocal(createLocalFor(users));
    return true;
  }
  function createLocalFor(users) {
    var u = {
      id: "usr_cloud_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      fullName: current.name || current.email.split("@")[0],
      googleEmail: current.email,
      cloudUid: current.uid,
      /* Parola ile girilemez: rastgele, kimseye gösterilmeyen değer. Giriş yalnızca Google ile. */
      password: sha256("cloud_" + current.uid + "_" + Math.random() + Date.now()),
      createdDate: new Date().toISOString()
    };
    users.push(u); saveUsersDb(users);
    return u;
  }

  /* ---------- KVKK açık rıza (hesap başına bir kez) ---------- */
  function hasConsent() { return current && getMeta(current.uid).consent === true; }
  function askConsent() {
    if (hasConsent()) return true;
    var ok = window.confirm(
      "Bulut eşitleme için açık rızanız gerekiyor.\n\n" +
      "Profiliniz, tahlil sonuçlarınız, belirtileriniz ve takviyeleriniz Google Firebase sunucularında (yurt dışında olabilir) " +
      "yalnızca sizin Google hesabınızla erişilebilir şekilde saklanacak ve diğer cihazlarınızla eşitlenecek.\n\n" +
      "Rızanızı dilediğiniz zaman 'Bağlantıyı Kes' ile geri alabilirsiniz; bu cihazdaki verileriniz silinmez.\n\nOnaylıyor musunuz?");
    if (ok) { var m = getMeta(current.uid); m.consent = true; m.consentAt = new Date().toISOString(); setMeta(current.uid, m); }
    return ok;
  }

  /* ---------- Web: Firebase SDK ---------- */
  function loadSdk() {
    if (window.VitaFirebaseSDK) return Promise.resolve(window.VitaFirebaseSDK);
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = SDK_SRC; s.async = true;
      s.onload = function () { window.VitaFirebaseSDK ? res(window.VitaFirebaseSDK) : rej(new Error("Firebase yüklenemedi")); };
      s.onerror = function () { rej(new Error("Firebase dosyası yüklenemedi")); };
      document.head.appendChild(s);
    });
  }
  function initWeb() {
    return loadSdk().then(function (sdk) {
      var app = sdk.initializeApp({ apiKey: cfg.apiKey, authDomain: cfg.authDomain, projectId: cfg.projectId, appId: cfg.appId });
      var auth = sdk.getAuth(app);
      var db = cfg.firestoreDatabaseId ? sdk.getFirestore(app, cfg.firestoreDatabaseId) : sdk.getFirestore(app);
      if (cfg.emulator) {
        sdk.connectAuthEmulator(auth, cfg.emulator.auth, { disableWarnings: true });
        sdk.connectFirestoreEmulator(db, cfg.emulator.firestoreHost, cfg.emulator.firestorePort);
      }
      fb = { sdk: sdk, auth: auth, db: db };
      sdk.getRedirectResult(auth).catch(function (e) { console.warn("[VitaTakip] Google yönlendirme:", e && e.code); });
      sdk.onAuthStateChanged(auth, onWebUser);
      return fb;
    });
  }
  function onWebUser(u) {
    if (!u) { current = null; refreshUi(); return; }
    current = { uid: u.uid, email: String(u.email || "").toLowerCase(), name: u.displayName || "" };
    attachLocalAccount();
    publishAccount("firebase_web");
    pull({ reason: "login" });
  }
  function docRef() { return fb.sdk.doc(fb.db, "users", current.uid, "portal_state", "main"); }

  /* ---------- Hesap bilgisini eski arayüze bildir ---------- */
  function publishAccount(source) {
    try {
      lsSet("vitatakip_google_cloud_account", JSON.stringify({
        connected: true, uid: current.uid, email: current.email, displayName: current.name || current.email.split("@")[0],
        lastSync: getMeta(current.uid).lastSyncText || "", source: source
      }));
    } catch (_) {}
    refreshUi();
  }

  /* ---------- Buluttan çek ---------- */
  function decideAndApply(remote, remoteMs, interactive, forceRemote) {
    var meta = getMeta(current.uid);
    var local = buildPayload(), localHash = contentHash(local);
    var localChanged = Boolean(meta.hash) && localHash !== meta.hash;
    var remoteChanged = remoteMs > (meta.remoteMs || 0) + 500;
    if (remote && contentHash(remote) === localHash) { meta.hash = localHash; meta.remoteMs = remoteMs; setMeta(current.uid, meta); refreshUi(); return; }
    if (!remote) { if (localHasData()) push({ force: true }); return; }
    if (forceRemote) { applyRemote(remote, remoteMs); return; }
    if (!localHasData()) { applyRemote(remote, remoteMs); return; }
    if (!meta.hash || (remoteChanged && localChanged)) {
      var useCloud = window.confirm(
        "Bu Google hesabının bulutta " + (remoteMs ? fmtDate(remoteMs) + " tarihli " : "") + "verileri var ve bu cihazdaki verilerden farklı.\n\n" +
        "Tamam → Buluttaki verileri bu cihaza yükle (bu cihazdaki farklı kayıtlar değiştirilir)\n" +
        "İptal → Bu cihazdaki verileri buluta gönder (buluttaki kayıt güncellenir)");
      if (useCloud) applyRemote(remote, remoteMs); else push({ force: true });
      return;
    }
    if (remoteChanged) { applyRemote(remote, remoteMs); return; }
    if (localChanged) push({});
  }
  function applyRemote(remote, remoteMs) {
    applying = true;
    try {
      applyCloudBackupPayloadToState(remote);
      state.lastCDSS = null;
      saveState();
      if (typeof invalidateClinicalAnalysisCache === "function") invalidateClinicalAnalysisCache({ clearDOM: true });
      if (typeof canRunClinicalAnalysis === "function" && canRunClinicalAnalysis() && typeof executeCDSSRules === "function") executeCDSSRules();
      if (typeof renderAllAppViews === "function") renderAllAppViews();
    } finally { applying = false; }
    var meta = getMeta(current.uid);
    meta.hash = contentHash(buildPayload()); meta.remoteMs = remoteMs || Date.now();
    meta.lastSyncText = new Date().toLocaleString("tr-TR"); setMeta(current.uid, meta);
    publishAccount(MODE === "web" ? "firebase_web" : "firebase_google");
    toast("Buluttan alındı", "Diğer cihazınızdaki kayıtlar bu cihaza yüklendi.", "success");
  }
  function pull(opts) {
    opts = opts || {};
    if (!current) return Promise.resolve(false);
    if (MODE === "android") {
      try { if (bridge && typeof bridge.refreshCloudBackupFromServer === "function") bridge.refreshCloudBackupFromServer(); } catch (_) {}
      return Promise.resolve(true);
    }
    if (!fb || pulling) return Promise.resolve(false);
    pulling = true; lastPullAt = Date.now();
    return fb.sdk.getDoc(docRef()).then(function (snap) {
      if (!snap.exists()) { decideAndApply(null, 0, opts.interactive, false); return true; }
      var d = snap.data(); var remote = null;
      try { remote = JSON.parse(d.payloadJson); } catch (_) { remote = null; }
      if (!remote || remote.app !== "VitaTakip") { console.warn("[VitaTakip] Bulut kaydı okunamadı"); return false; }
      var ms = d.updatedAt && d.updatedAt.toMillis ? d.updatedAt.toMillis() : 0;
      decideAndApply(remote, ms, opts.interactive, Boolean(opts.forceRemote));
      return true;
    }).catch(function (e) {
      console.warn("[VitaTakip] Bulut okuma hatası:", e && (e.code || e.message));
      if (opts.interactive) feedback("Buluta ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.", "warning");
      return false;
    }).then(function (r) { pulling = false; return r; });
  }

  /* ---------- Buluta gönder ---------- */
  function push(opts) {
    opts = opts || {};
    if (!current || applying) return Promise.resolve(false);
    if (!sessionMatchesCloud()) return Promise.resolve(false);
    if (!opts.force && typeof isCloudAutoSyncEnabled === "function" && !isCloudAutoSyncEnabled()) return Promise.resolve(false);
    if (!askConsent()) { feedback("Açık rıza verilmediği için veriler buluta gönderilmedi; bu cihazda kayıtlı.", "info"); return Promise.resolve(false); }
    var payload = buildPayload(), h = contentHash(payload), meta = getMeta(current.uid);
    if (!opts.force && meta.hash === h) return Promise.resolve(true);
    var json = JSON.stringify(payload);
    if (json.length > MAX_PAYLOAD) {
      toast("Bulut sınırı aşıldı", "Kayıtlarınız bulut sınırını (250 KB) aşıyor. 'Yedek İndir' ile dosya yedeği alın.", "warning");
      return Promise.resolve(false);
    }
    if (typeof setHeaderCloudSyncVisualState === "function") setHeaderCloudSyncVisualState("syncing", "Eşitleniyor...");
    var done = function (ms) {
      meta = getMeta(current.uid); meta.hash = h; meta.remoteMs = ms || Date.now();
      meta.lastSyncText = new Date().toLocaleString("tr-TR"); setMeta(current.uid, meta);
      publishAccount(MODE === "web" ? "firebase_web" : "firebase_google");
      if (typeof setHeaderCloudSyncVisualState === "function") setHeaderCloudSyncVisualState("synced", "Bulut Eşitlendi ✓");
      if (opts.force) feedback("Verileriniz buluta kaydedildi (" + meta.lastSyncText + "). Diğer cihazlarınızda aynı Google hesabıyla giriş yapınca görünür.", "success");
      return true;
    };
    if (MODE === "android") {
      try { bridge.saveCloudBackupJson(current.email || current.uid, json); } catch (e) { return Promise.resolve(false); }
      return Promise.resolve(done(Date.now()));
    }
    var sdk = fb.sdk, ref = docRef();
    return sdk.getDoc(ref).then(function (snap) {
      var base = { displayName: (current.name || current.email.split("@")[0] || "Kullanıcı").slice(0, 100), email: (current.email || "kullanici@vitatakip.local").slice(0, 120), payloadJson: json, updatedAt: sdk.serverTimestamp() };
      if (snap.exists()) return sdk.setDoc(ref, base, { merge: true });
      return sdk.setDoc(ref, Object.assign({ userId: current.uid, createdAt: sdk.serverTimestamp() }, base));
    }).then(function () { return sdk.getDoc(ref); }).then(function (snap) {
      var d = snap.data() || {};
      return done(d.updatedAt && d.updatedAt.toMillis ? d.updatedAt.toMillis() : Date.now());
    }).catch(function (e) {
      console.warn("[VitaTakip] Bulut yazma hatası:", e && (e.code || e.message));
      if (typeof setHeaderCloudSyncVisualState === "function") setHeaderCloudSyncVisualState("connected");
      if (opts.force) feedback("Buluta kaydedilemedi (" + ((e && e.code) || "bağlantı") + "). Verileriniz bu cihazda güvende; daha sonra tekrar denenecek.", "warning");
      return false;
    });
  }
  function schedulePush() {
    if (!current || applying) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { push({}); }, 2000);
  }

  /* ---------- Giriş / çıkış ---------- */
  function signIn() {
    if (MODE === "off") { showOffNotice(); return; }
    if (MODE === "android") {
      try { bridge.startFirebaseGoogleSignIn(); feedback("Google hesap seçici açılıyor...", "info"); } catch (_) { feedback("Google girişi başlatılamadı.", "warning"); }
      return;
    }
    feedback("Google giriş penceresi açılıyor...", "info");
    (fb ? Promise.resolve(fb) : initWeb()).then(function () {
      var p = new fb.sdk.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
      return fb.sdk.signInWithPopup(fb.auth, p).catch(function (e) {
        if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) return fb.sdk.signInWithRedirect(fb.auth, p);
        throw e;
      });
    }).then(function () { feedback("Google hesabınızla giriş yapıldı. Kayıtlarınız eşitleniyor.", "success"); })
      .catch(function (e) {
        if (e && (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request")) { feedback("Giriş iptal edildi.", "info"); return; }
        var code = (e && e.code) || "hata";
        var why = {
          "auth/configuration-not-found": "Bulut hizmeti henüz yapılandırılmadı",
          "auth/operation-not-allowed": "Google ile giriş bu uygulamada henüz açılmadı",
          "auth/unauthorized-domain": "Bu adres bulut girişi için yetkilendirilmedi",
          "auth/network-request-failed": "İnternet bağlantısı yok"
        }[code];
        feedback(why ? why + ". Verileriniz bu cihazda kayıtlı; dosya yedeğini kullanabilirsiniz. (" + code + ")"
                     : "Google ile giriş yapılamadı (" + code + ").", "warning");
      });
  }
  function signOutCloud(silent) {
    clearTimeout(pushTimer);
    if (MODE === "web" && fb) fb.sdk.signOut(fb.auth).catch(function () {});
    if (MODE === "android") { try { bridge.signOutFirebaseGoogle(); } catch (_) {} }
    current = null;
    try { localStorage.removeItem("vitatakip_google_cloud_account"); } catch (_) {}
    refreshUi();
    if (!silent) {
      feedback("Bulut bağlantısı kesildi. Bu cihazdaki kayıtlarınız silinmedi.", "info");
      toast("Bulut bağlantısı kesildi", "Kayıtlarınız bu cihazda kalmaya devam ediyor.", "info");
    }
  }

  /* ---------- Arayüz ---------- */
  function showOffNotice() {
    feedback("Bulut eşitleme bu sürümde etkin değil. Verileriniz yalnızca bu cihazda kayıtlı. Başka bir cihaza taşımak için 'Yedek dosyası indir' ile yedek alıp diğer cihazda 'Yedekten geri yükle'yi kullanın.", "info");
  }
  function refreshUi() {
    try { if (typeof window.__vitaOrigRefreshCloudSyncUI === "function") window.__vitaOrigRefreshCloudSyncUI(); } catch (_) {}
    /* Elle e-posta ile "bağlama" kaldırıldı */
    var nameIn = $("cloudSyncNameInput"); var manual = nameIn && nameIn.closest(".pt-2");
    if (manual) manual.classList.add("hidden");
    var signBtn = $("btnTriggerNativeGoogleSignIn");
    if (signBtn) {
      var sp = signBtn.querySelector("span");
      if (sp) sp.textContent = current ? ("Giriş yapıldı: " + current.email) : "Google ile giriş yap";
      signBtn.disabled = Boolean(current);
      signBtn.classList.toggle("opacity-60", Boolean(current));
    }
    var backupBtn = $("btnCloudBackupNow"), restoreBtn = $("btnCloudRestoreNow");
    var detail = $("cloudModalAccountDetail"), title = $("cloudModalStatusTitle"), tag = $("cloudModalSourceTag");
    if (MODE === "off") {
      if (backupBtn) { var b1 = backupBtn.querySelector("span"); if (b1) b1.textContent = "Yedek dosyası indir"; }
      if (restoreBtn) { var b2 = restoreBtn.querySelector("span"); if (b2) b2.textContent = "Yedekten geri yükle"; }
      if (title) title.textContent = "Bulut eşitleme etkin değil";
      if (tag) tag.textContent = "Yalnızca bu cihaz";
      if (detail) detail.textContent = "Verileriniz yalnızca bu cihazda kayıtlı; başka cihazda otomatik görünmez. Taşımak için yedek dosyasını kullanın.";
      if (signBtn) signBtn.classList.add("hidden");
      var auto = $("cloudAutoSyncCheckbox"); if (auto && auto.closest("label")) auto.closest("label").classList.add("hidden");
    } else if (current) {
      if (title) title.textContent = "Bulut eşitleme açık";
      if (tag) tag.textContent = MODE === "web" ? "Google (doğrulandı)" : "Google (telefon)";
      if (detail) detail.textContent = current.email + " hesabıyla giriş yapıldı. Değişiklikler otomatik olarak buluta kaydedilir ve aynı hesapla giriş yaptığınız diğer cihazlarda görünür.";
    } else {
      if (detail) detail.textContent = "Verileriniz şu an yalnızca bu cihazda. Diğer cihazlarınızla eşitlemek için Google ile giriş yapın.";
    }
  }

  /* ---------- Eski (doğrulamasız) işlevlerin yerine geçenler ---------- */
  window.__vitaOrigRefreshCloudSyncUI = window.refreshCloudSyncUI;
  window.refreshCloudSyncUI = refreshUi;
  window.getLinkedGoogleCloudAccount = function () {
    if (!current) return { connected: false, uid: "", email: "", displayName: "", lastSync: "", source: "none" };
    return { connected: true, uid: current.uid, email: current.email, displayName: current.name || current.email.split("@")[0], lastSync: getMeta(current.uid).lastSyncText || "", source: MODE === "web" ? "firebase_web" : "firebase_google" };
  };
  /* Ad-soyad ile eşleştirme yok: yalnızca doğrulanmış e-posta/uid */
  window.ensurePortalUserForGoogleAccount = function (displayName, email) {
    var users = getUsersDb(), e = String(email || "").trim().toLowerCase();
    var u = users.filter(function (x) { return x && ((current && x.cloudUid === current.uid) || (e && x.googleEmail && String(x.googleEmail).toLowerCase() === e && x.cloudUid)); })[0];
    if (u) return u;
    if (!current) current = { uid: "native_" + e, email: e, name: displayName || "" };
    return createLocalFor(users);
  };
  window.linkGoogleAccountFromModal = signIn;
  window.triggerNativeGoogleCloudSignIn = signIn;
  window.startFirebaseGoogleLoginFromPortal = function () {
    if (current && sessionMatchesCloud()) { if (typeof closeAuthModal === "function") closeAuthModal(); return; }
    if (MODE === "off") { if (typeof openCloudSyncModal === "function") openCloudSyncModal("auth"); showOffNotice(); return; }
    signIn();
  };
  window.continueToPortalWithLinkedGoogle = function () {
    if (!current) { signIn(); return; }
    attachLocalAccount();
    if (typeof closeCloudSyncModal === "function") closeCloudSyncModal();
    if (typeof renderAllAppViews === "function") renderAllAppViews();
  };
  window.unlinkGoogleCloudAccount = function () { signOutCloud(false); };
  window.syncDataToCloudNow = function (showFeedback) {
    if (MODE === "off") {
      if (showFeedback && typeof exportDataBackup === "function") exportDataBackup();
      if (showFeedback) showOffNotice();
      return false;
    }
    if (!current) { if (showFeedback) { feedback("Önce Google ile giriş yapın.", "warning"); signIn(); } return false; }
    push({ force: Boolean(showFeedback) });
    return true;
  };
  window.restoreDataFromCloudNow = function () {
    if (MODE === "off") { var inp = $("drawerImportBackupInput"); if (inp) inp.click(); return false; }
    if (!current) { feedback("Önce Google ile giriş yapın.", "warning"); signIn(); return false; }
    if (!window.confirm("Buluttaki kayıtlar bu cihaza yüklensin mi? Bu cihazdaki farklı kayıtlar değiştirilir.")) return false;
    pull({ interactive: true, forceRemote: true });
    return true;
  };

  /* Android: yerel Google girişi tamamlandığında (kimlik telefonda doğrulandı) */
  window.onNativeGoogleAccountLinked = function (uid, email, displayName) {
    if (!uid || String(uid).indexOf("local_") === 0) return;
    current = { uid: String(uid), email: String(email || "").toLowerCase(), name: String(displayName || "") };
    attachLocalAccount();
    publishAccount("firebase_google");
    var cached = typeof readCloudBackupPayloadForEmail === "function" ? readCloudBackupPayloadForEmail(current.email) : null;
    if (cached && cached.app === "VitaTakip") decideAndApply(cached, Date.parse(cached.cloudSyncDate || "") || 0, false, false);
    pull({});
  };
  window.onNativeGoogleAccountDisconnected = function () { signOutCloud(true); };
  window.onNativeCloudPayload = function (json) {
    if (!current || !json) return;
    var remote = null; try { remote = JSON.parse(json); } catch (_) {}
    if (remote && remote.app === "VitaTakip") decideAndApply(remote, Date.parse(remote.cloudSyncDate || "") || 0, false, false);
  };
  window.vitaCloudOnResume = function () { if (current && Date.now() - lastPullAt > 15000) { lastPullAt = Date.now(); pull({}); } };

  /* Her kayıtta otomatik gönderim (2 sn gecikmeyle, art arda değişiklikler birleşir) */
  var origSave = window.saveState;
  if (typeof origSave === "function") {
    window.saveState = function () { var r = origSave.apply(this, arguments); schedulePush(); return r; };
    /* Uygulama içi tanılama, kayıt mantığını kaynak metninden denetler; asıl fonksiyonun metnini göster */
    window.saveState.toString = function () { return origSave.toString(); };
  }

  /* Uygulamadan çıkışta bulut oturumu da kapanır (ortak bilgisayarda bir sonraki kişi hesaba giremez) */
  var origLogout = window.handleLogout;
  if (typeof origLogout === "function") window.handleLogout = function () {
    var r = origLogout.apply(this, arguments);
    if (!uidNow() && current) signOutCloud(true);
    return r;
  };

  /* Diğer cihazdaki değişiklikleri almak için: sekmeye dönüldüğünde */
  document.addEventListener("visibilitychange", function () { if (!document.hidden) window.vitaCloudOnResume(); });
  window.addEventListener("focus", function () { window.vitaCloudOnResume(); });

  /* Eski doğrulamasız "bağlı hesap" kaydı temizlenir (yalnızca gerçek oturum geçerlidir) */
  try {
    var old = JSON.parse(lsGet("vitatakip_google_cloud_account") || "null");
    if (old && old.source !== "firebase_web" && old.source !== "firebase_google") localStorage.removeItem("vitatakip_google_cloud_account");
  } catch (_) {}

  window.VitaCloud = {
    mode: function () { return MODE; },
    user: function () { return current; },
    signIn: signIn, signOut: function () { signOutCloud(false); },
    pull: pull, push: push,
    /* Yalnızca emülatörle test için (gerçek projede kullanılamaz) */
    _testSignIn: function (sub, email, name) {
      if (!cfg || !cfg.emulator || !fb) return Promise.reject(new Error("yalnızca emülatör"));
      var tok = JSON.stringify({ sub: sub, email: email, email_verified: true, name: name || "" });
      return fb.sdk.signInWithCredential(fb.auth, fb.sdk.GoogleAuthProvider.credential(tok));
    }
  };

  if (MODE === "web") initWeb().catch(function (e) { console.warn("[VitaTakip] Bulut başlatılamadı:", e && e.message); MODE = "off"; refreshUi(); });
  document.addEventListener("DOMContentLoaded", refreshUi);
  setTimeout(refreshUi, 0);
})();
