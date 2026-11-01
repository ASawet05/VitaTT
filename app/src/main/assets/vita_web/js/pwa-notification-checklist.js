/* ========================================================================= */
/*   PWA BİLDİRİM İZİNLERİ & HATIRLATICI AKILLI KONTROL LİSTESİ BİLEŞENİ     */
/*   Otomatik Gruplama: Tarayıcı Türü & Service Worker Kayıt Durumu          */
/* ========================================================================= */
(function () {
  "use strict";

  const STORAGE_KEY_ENABLED = "vitatakip_notifications_enabled";
  const STORAGE_KEY_TESTED = "vitatakip_pwa_notif_tested";
  const STORAGE_KEY_TEST_TIME = "vitatakip_pwa_notif_test_time";

  let activeFilter = "all"; // 'all' | 'pending' | 'completed'
  let activeGroupBy = "auto_combined"; // 'auto_combined' | 'browser_type' | 'sw_status'
  let swRegistrationStatus = "checking"; // 'active' | 'waiting' | 'installing' | 'bridged' | 'registered' | 'unregistered' | 'unavailable'
  let swScopeInfo = "";
  let permissionsApiListenerAttached = false;

  function safeGetStorage(key) {
    try {
      if (typeof window.safeLocalStorageGetItem === "function") {
        return window.safeLocalStorageGetItem(key);
      }
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeSetStorage(key, val) {
    try {
      if (typeof window.safeLocalStorageSetItem === "function") {
        window.safeLocalStorageSetItem(key, val);
        return;
      }
      localStorage.setItem(key, val);
    } catch (_) {}
  }

  function hasAndroidBridge() {
    return Boolean(
      window.AndroidVitaBridge &&
        typeof window.AndroidVitaBridge.getNotificationPermissionStatus === "function"
    );
  }

  /**
   * Automatically detects the browser type and returns a structured profile
   * used to group notification permission statuses and browser-specific rules.
   */
  function detectBrowserProfile() {
    const ua = String(navigator.userAgent || "");
    const hasBridge = hasAndroidBridge();
    const isStandalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true ||
      hasBridge;

    if (hasBridge || /; wv\)|Version\/[\d.]+ Chrome\/[\d.]+ Mobile/i.test(ua)) {
      return {
        key: "android_webview",
        label: "Android Hibrit WebView + Native Köprü",
        shortLabel: "Android Hibrit (APK)",
        engine: "Blink / Android WebView + POST_NOTIFICATIONS",
        icon: "fa-brands fa-android text-emerald-600",
        isStandalone: true,
        permissionHint: "Android 13+ çalışma zamanı POST_NOTIFICATIONS izni ve Web Notification API birlikte denetlenir."
      };
    }
    if (/Edg\//i.test(ua)) {
      return {
        key: "chromium_edge",
        label: "Microsoft Edge (Chromium PWA)",
        shortLabel: "Edge (Chromium)",
        engine: "Blink / Chromium Push & SW",
        icon: "fa-brands fa-edge text-sky-600",
        isStandalone: isStandalone,
        permissionHint: "Adres çubuğundaki kilit simgesi üzerinden masaüstü ve arka plan PWA bildirimleri yönetilir."
      };
    }
    if (/Firefox\//i.test(ua) || /FxiOS\//i.test(ua)) {
      return {
        key: "firefox_gecko",
        label: "Mozilla Firefox (Gecko)",
        shortLabel: "Firefox (Gecko)",
        engine: "Gecko Notification & ServiceWorker",
        icon: "fa-brands fa-firefox-browser text-amber-600",
        isStandalone: isStandalone,
        permissionHint: "Firefox izin baloncuğu etkileşim gerektirir; engellenirse adres çubuğu izinlerinden sıfırlanır."
      };
    }
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua) && !/Chromium\//i.test(ua)) {
      return {
        key: "webkit_safari",
        label: "Apple Safari / WebKit (iOS & macOS)",
        shortLabel: "Safari / WebKit",
        engine: "WebKit Push & Standalone PWA",
        icon: "fa-brands fa-safari text-sky-500",
        isStandalone: isStandalone,
        permissionHint: "iOS/iPadOS cihazlarda bildirim izni için uygulamanın 'Ana Ekrana Ekle' ile PWA olarak açılması gerekir."
      };
    }
    return {
      key: "chromium_chrome",
      label: "Google Chrome / Chromium PWA",
      shortLabel: "Chrome (Chromium)",
      engine: "Blink / Chromium Service Worker",
      icon: "fa-brands fa-chrome text-teal-600",
      isStandalone: isStandalone,
      permissionHint: "Chrome W3C Notification API ve Service Worker showNotification() tam uyumludur."
    };
  }

  /**
   * Returns a structured Service Worker registration profile for grouping.
   */
  function getServiceWorkerRegistrationProfile() {
    const hasBridge = hasAndroidBridge();
    if (swRegistrationStatus === "active" || swRegistrationStatus === "registered") {
      return {
        key: "sw_active",
        label: "SW Kayıtlı & Aktif (Activated)",
        shortLabel: "SW Aktif",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
        icon: "fa-solid fa-bolt text-emerald-600",
        ready: true,
        scopeText: swScopeInfo || "./ (Kök Kapsam)",
        summary: "Service Worker (sw.js) aktif durumda; arka plan bildirim tetiklemeleri ve çevrimdışı önbellek çalışıyor."
      };
    }
    if (swRegistrationStatus === "waiting" || swRegistrationStatus === "installing") {
      return {
        key: "sw_pending",
        label: "SW Kuruluyor / Beklemede (Installing/Waiting)",
        shortLabel: "SW Beklemede",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
        icon: "fa-solid fa-spinner text-amber-600",
        ready: true,
        scopeText: swScopeInfo || "./",
        summary: "Service Worker kaydedildi ve etkinleştirme aşamasında."
      };
    }
    if (swRegistrationStatus === "bridged" || hasBridge) {
      return {
        key: "sw_hybrid_bridge",
        label: "Hibrit Mobil Bildirim Köprüsü (Android Native Kanal)",
        shortLabel: "Hibrit Kanal Aktif",
        badgeClass: "bg-teal-100 text-teal-800 border-teal-300",
        icon: "fa-solid fa-mobile-screen-button text-teal-600",
        ready: true,
        scopeText: "vitatakip_dosage_channel (Android Sistem Kanalı)",
        summary: "Android yerel bildirim kanalı üzerinden doğrudan sistem bildirim çubuğuna teslimat yapılır."
      };
    }
    return {
      key: "sw_unregistered",
      label: "SW Kayıtsız / Devre Dışı (Unregistered)",
      shortLabel: "SW Kayıtsız",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
      icon: "fa-solid fa-circle-xmark text-rose-600",
      ready: false,
      scopeText: "Kayıt yok",
      summary: "Service Worker henüz kayıtlı değil; bildirimler yalnızca açık sekme üzerinden gönderilebilir."
    };
  }

  function getEffectivePermissionState() {
    let androidPerm = null;
    if (hasAndroidBridge()) {
      try {
        androidPerm = String(window.AndroidVitaBridge.getNotificationPermissionStatus() || "").toLowerCase();
      } catch (_) {}
    }

    let webPerm = "unsupported";
    if ("Notification" in window) {
      try {
        webPerm = String(Notification.permission || "default").toLowerCase();
      } catch (_) {
        webPerm = "default";
      }
    }

    if (androidPerm === "granted" || webPerm === "granted") {
      return "granted";
    }
    if (androidPerm === "denied" || (webPerm === "denied" && !hasAndroidBridge())) {
      return "denied";
    }
    if (hasAndroidBridge() || "Notification" in window) {
      return "default";
    }
    return "unsupported";
  }

  async function refreshServiceWorkerState() {
    if (hasAndroidBridge() && window.location.protocol === "file:") {
      swRegistrationStatus = "bridged";
      swScopeInfo = "file:///android_asset/vita_web/";
      return swRegistrationStatus;
    }
    if (!("serviceWorker" in navigator)) {
      swRegistrationStatus = hasAndroidBridge() ? "bridged" : "unavailable";
      return swRegistrationStatus;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        swScopeInfo = reg.scope || "./";
        if (reg.active) {
          swRegistrationStatus = "active";
        } else if (reg.waiting) {
          swRegistrationStatus = "waiting";
        } else if (reg.installing) {
          swRegistrationStatus = "installing";
        } else {
          swRegistrationStatus = "registered";
        }
      } else if (/^https?:$/i.test(window.location.protocol)) {
        const newReg = await navigator.serviceWorker.register("sw.js");
        swScopeInfo = (newReg && newReg.scope) || "./";
        swRegistrationStatus = newReg ? "registered" : "unregistered";
      } else {
        swRegistrationStatus = hasAndroidBridge() ? "bridged" : "unregistered";
      }
    } catch (_) {
      swRegistrationStatus = hasAndroidBridge() ? "bridged" : "unregistered";
    }
    return swRegistrationStatus;
  }

  function getScheduledSupplementsSummary() {
    const list = (window.state && Array.isArray(window.state.supplements))
      ? window.state.supplements
      : [];
    const total = list.length;
    const pendingToday = list.filter(item => !item.taken).length;
    return { total, pendingToday };
  }

  function buildSmartChecklistItems() {
    const browserProfile = detectBrowserProfile();
    const swProfile = getServiceWorkerRegistrationProfile();
    const hasWebApi = "Notification" in window;
    const hasBridge = hasAndroidBridge();
    const apiSupported = hasWebApi || hasBridge;

    const isSecure = Boolean(
      window.isSecureContext ||
        window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.protocol === "file:" ||
        hasBridge
    );

    const permState = getEffectivePermissionState();
    const isPermGranted = permState === "granted";
    const isPermDenied = permState === "denied";

    const swReady = swProfile.ready;

    const schedulerFlag = safeGetStorage(STORAGE_KEY_ENABLED) === "true";
    const schedulerActive = schedulerFlag && isPermGranted;
    const suppSummary = getScheduledSupplementsSummary();

    const testVerified = safeGetStorage(STORAGE_KEY_TESTED) === "true";
    const lastTestTime = safeGetStorage(STORAGE_KEY_TEST_TIME) || "";

    return [
      {
        id: "api_support",
        order: 1,
        browserGroupKey: browserProfile.key,
        browserGroupLabel: `Tarayıcı Grubu: ${browserProfile.shortLabel}`,
        swGroupKey: swProfile.key,
        swGroupLabel: `SW Durumu: ${swProfile.shortLabel}`,
        categoryCluster: "browser_permission",
        title: `Tarayıcı Bildirim Motoru (${browserProfile.shortLabel})`,
        description: hasBridge && hasWebApi
          ? `${browserProfile.label}: Hem Web Notification API hem de Android Sistem Bildirim Köprüsü aktif.`
          : hasBridge
          ? `${browserProfile.label}: Android POST_NOTIFICATIONS sistem köprüsü üzerinden çalışıyor.`
          : hasWebApi
          ? `${browserProfile.label}: W3C Web Notification API standardı destekleniyor.`
          : `${browserProfile.label}: Bu tarayıcıda Web Notification API desteği bulunamadı.`,
        badgeText: apiSupported
          ? (hasBridge ? "Web + Mobil Köprü" : "Web API Aktif")
          : "Desteklenmiyor",
        status: apiSupported ? "completed" : "error",
        completed: apiSupported,
        actionLabel: null,
        actionType: null
      },
      {
        id: "secure_context",
        order: 2,
        browserGroupKey: browserProfile.key,
        browserGroupLabel: `Tarayıcı Grubu: ${browserProfile.shortLabel}`,
        swGroupKey: swProfile.key,
        swGroupLabel: `SW Durumu: ${swProfile.shortLabel}`,
        categoryCluster: "browser_permission",
        title: "Güvenli Bağlam & PWA Kurulum Uyumu",
        description: isSecure
          ? `${browserProfile.shortLabel} üzerinde güvenli iletişim katmanı (HTTPS / Localhost / Mobil Paket) doğrulandı.`
          : "Tarayıcı bildirim izinleri için uygulamanın HTTPS veya localhost üzerinden açılması gerekir.",
        badgeText: isSecure ? "Güvenli Bağlam" : "HTTPS Gerekli",
        status: isSecure ? "completed" : "warning",
        completed: isSecure,
        actionLabel: null,
        actionType: null
      },
      {
        id: "permission_state",
        order: 3,
        browserGroupKey: browserProfile.key,
        browserGroupLabel: `Tarayıcı Grubu: ${browserProfile.shortLabel}`,
        swGroupKey: swProfile.key,
        swGroupLabel: `SW Durumu: ${swProfile.shortLabel}`,
        categoryCluster: "browser_permission",
        title: `Tarayıcı & Cihaz İzin Durumu (${permState.toUpperCase()})`,
        description: isPermGranted
          ? `${browserProfile.shortLabel} bildirim izni onaylandı (granted). ${browserProfile.permissionHint}`
          : isPermDenied
          ? `${browserProfile.shortLabel} üzerinde izin engellenmiş (denied). ${browserProfile.permissionHint}`
          : `${browserProfile.shortLabel} üzerinde bildirim izni bekleniyor (default). Yetkilendirmek için dokunun.`,
        badgeText: isPermGranted
          ? "İzin Verildi (Granted)"
          : isPermDenied
          ? "Engellendi (Denied)"
          : "İzin Bekleniyor",
        status: isPermGranted ? "completed" : isPermDenied ? "error" : "pending",
        completed: isPermGranted,
        actionLabel: isPermGranted
          ? "İzni Doğrula"
          : isPermDenied && hasBridge
          ? "Uygulama Ayarlarını Aç"
          : "Bildirim İzni İste",
        actionType: isPermDenied && hasBridge ? "open_settings" : "request_permission"
      },
      {
        id: "service_worker",
        order: 4,
        browserGroupKey: browserProfile.key,
        browserGroupLabel: `Tarayıcı Grubu: ${browserProfile.shortLabel}`,
        swGroupKey: swProfile.key,
        swGroupLabel: `SW Durumu: ${swProfile.shortLabel}`,
        categoryCluster: "sw_registration",
        title: `Service Worker Kayıt Durumu (${swProfile.shortLabel})`,
        description: `${swProfile.summary} (Kapsam: ${swProfile.scopeText})`,
        badgeText: swProfile.shortLabel,
        status: swReady ? "completed" : "pending",
        completed: swReady,
        actionLabel: swReady ? "SW Yeniden Denetle" : "SW Kaydet & Etkinleştir",
        actionType: "check_sw"
      },
      {
        id: "dosage_scheduler",
        order: 5,
        browserGroupKey: browserProfile.key,
        browserGroupLabel: `Tarayıcı Grubu: ${browserProfile.shortLabel}`,
        swGroupKey: swProfile.key,
        swGroupLabel: `SW Durumu: ${swProfile.shortLabel}`,
        categoryCluster: "sw_registration",
        title: "Zamanlı Dozaj Hatırlatıcı & SW Kuyruk Bağlantısı",
        description: schedulerActive
          ? `Hatırlatıcı motoru ${swProfile.shortLabel} ile senkronize • Protokolde ${suppSummary.total} takviye (${suppSummary.pendingToday} bekleyen doz) izleniyor.`
          : "Zamanlı dozaj hatırlatıcı motoru kapalı. Günlük takviye saatlerinde bildirim almak için etkinleştirin.",
        badgeText: schedulerActive
          ? `Aktif (${suppSummary.total} Takviye)`
          : "Motor Kapalı",
        status: schedulerActive ? "completed" : "pending",
        completed: schedulerActive,
        actionLabel: schedulerActive ? "Motoru Kapat" : "Motoru Etkinleştir",
        actionType: "toggle_scheduler"
      },
      {
        id: "live_test_delivery",
        order: 6,
        browserGroupKey: browserProfile.key,
        browserGroupLabel: `Tarayıcı Grubu: ${browserProfile.shortLabel}`,
        swGroupKey: swProfile.key,
        swGroupLabel: `SW Durumu: ${swProfile.shortLabel}`,
        categoryCluster: "sw_registration",
        title: "Service Worker / Native Canlı Bildirim Doğrulaması",
        description: testVerified
          ? `${swProfile.shortLabel} üzerinden canlı bildirim teslimatı doğrulandı${lastTestTime ? " (Son test: " + lastTestTime + ")" : ""}.`
          : `${browserProfile.shortLabel} + ${swProfile.shortLabel} hattının bildirim gösterdiğini doğrulamak için test gönderin.`,
        badgeText: testVerified ? "Test Doğrulandı" : "Test Bekliyor",
        status: testVerified ? "completed" : "pending",
        completed: testVerified,
        actionLabel: "Test Bildirimi Gönder",
        actionType: "send_test"
      },
      (function () {
        const appConsent = safeGetStorage("vitatakip_camera_app_approved") !== "false";
        let camOsPerm = String(safeGetStorage("vitatakip_camera_perm_status") || "prompt").toLowerCase();
        if (hasBridge && typeof window.AndroidVitaBridge.getCameraPermissionStatus === "function") {
          try {
            camOsPerm = String(window.AndroidVitaBridge.getCameraPermissionStatus() || camOsPerm).toLowerCase();
          } catch (_) {}
        }
        const camGranted = appConsent && camOsPerm === "granted";
        const camDenied = !appConsent || camOsPerm === "denied";
        return {
          id: "camera_permission_state",
          order: 7,
          browserGroupKey: browserProfile.key,
          browserGroupLabel: `Tarayıcı Grubu: ${browserProfile.shortLabel}`,
          swGroupKey: swProfile.key,
          swGroupLabel: `SW Durumu: ${swProfile.shortLabel}`,
          categoryCluster: "browser_permission",
          title: "Kamera Erişim Onayı (Barkod Okuyucu & AI Kutu Fotoğraf Analizi)",
          description: camGranted
            ? "Kamera erişim izni onaylandı. Hem Barkod / Karekod Okuyucu hem de Yapay Zeka (AI) kutu fotoğraf analizi modülleri hazır."
            : !appConsent
            ? "Uygulama içi kamera erişim onayı Ayarlar > İzinler menüsünden kapatılmış. Tekrar açmak için onaylayın."
            : camOsPerm === "denied"
            ? "Cihaz/tarayıcı kamera izni engellenmiş. Barkod okuyucu ve AI fotoğraf analizi için uygulama ayarlarından Kamera iznini açın."
            : "Takviye/ilaç barkod okuyucu ve AI kutu fotoğrafı analizi için kamera erişim iznini onaylayın.",
          badgeText: camGranted
            ? "Kamera & AI Onaylı ✓"
            : !appConsent
            ? "Ayarlardan Kapalı"
            : camOsPerm === "denied"
            ? "Engellendi (Denied)"
            : "Kamera Onayı Bekliyor",
          status: camGranted ? "completed" : camDenied ? "error" : "pending",
          completed: camGranted,
          actionLabel: camGranted
            ? "Kamerayı Doğrula"
            : camOsPerm === "denied" && hasBridge
            ? "Cihaz Kamera Ayarları"
            : "Kamera İznini Onayla",
          actionType: camOsPerm === "denied" && hasBridge ? "open_camera_settings" : "request_camera_permission"
        };
      })()
    ];
  }

  /**
   * Automatically groups checklist items based on the selected grouping mode:
   * - 'auto_combined': Groups into (1) Browser Type & Permission Status Group and (2) Service Worker Registration & Delivery Group,
   *                    plus displays the Browser Type x SW Registration Status matrix.
   * - 'browser_type': Groups items under the detected Browser Type profile & cross-browser matrix.
   * - 'sw_status': Groups items by Service Worker registration lifecycle state.
   */
  function groupChecklistItems(items, browserProfile, swProfile, permState) {
    if (activeGroupBy === "browser_type") {
      return [
        {
          groupId: `browser_${browserProfile.key}`,
          groupTitle: `Tarayıcı Türü Grubu: ${browserProfile.label}`,
          groupSubtitle: `Motor: ${browserProfile.engine} • İzin Durumu: ${permState.toUpperCase()}`,
          groupIcon: browserProfile.icon,
          groupBadge: `${items.filter(i => i.completed).length}/${items.length} Tamamlandı`,
          headerTone: "bg-teal-50/70 border-teal-200",
          items: items
        }
      ];
    }

    if (activeGroupBy === "sw_status") {
      const swItems = items.filter(i => i.categoryCluster === "sw_registration");
      const permItems = items.filter(i => i.categoryCluster === "browser_permission");
      return [
        {
          groupId: `sw_${swProfile.key}`,
          groupTitle: `Service Worker Kayıt Grubu: ${swProfile.label}`,
          groupSubtitle: `Kapsam: ${swProfile.scopeText} • Arka Plan & Bildirim Kuyruğu`,
          groupIcon: swProfile.icon,
          groupBadge: `${swItems.filter(i => i.completed).length}/${swItems.length} Hazır`,
          headerTone: "bg-sky-50/70 border-sky-200",
          items: swItems
        },
        {
          groupId: `perm_${browserProfile.key}`,
          groupTitle: `İzin & Güvenli Bağlam Önkoşulları (${browserProfile.shortLabel})`,
          groupSubtitle: `SW bildirim tetiklemesi için gereken tarayıcı izinleri (${permState.toUpperCase()})`,
          groupIcon: browserProfile.icon,
          groupBadge: `${permItems.filter(i => i.completed).length}/${permItems.length} Hazır`,
          headerTone: "bg-slate-100/80 border-slate-200",
          items: permItems
        }
      ];
    }

    // Default 'auto_combined': Automatically groups by (1) Browser Type & Permission Status, and (2) Service Worker Registration Status
    const browserPermItems = items.filter(i => i.categoryCluster === "browser_permission");
    const swRegItems = items.filter(i => i.categoryCluster === "sw_registration");

    return [
      {
        groupId: `auto_browser_${browserProfile.key}`,
        groupTitle: `1. Tarayıcı Türüne Göre İzin Grubu: ${browserProfile.label}`,
        groupSubtitle: `${browserProfile.engine} • Aktif İzin: ${permState.toUpperCase()}`,
        groupIcon: browserProfile.icon,
        groupBadge: `${browserPermItems.filter(i => i.completed).length}/${browserPermItems.length} İzin Kriteri`,
        headerTone: "bg-teal-50/60 border-teal-200",
        items: browserPermItems
      },
      {
        groupId: `auto_sw_${swProfile.key}`,
        groupTitle: `2. Service Worker Kayıt Durumu Grubu: ${swProfile.label}`,
        groupSubtitle: `Kapsam: ${swProfile.scopeText} • Zamanlayıcı ve Bildirim Teslimatı`,
        groupIcon: swProfile.icon,
        groupBadge: `${swRegItems.filter(i => i.completed).length}/${swRegItems.length} SW Kriteri`,
        headerTone: "bg-sky-50/60 border-sky-200",
        items: swRegItems
      }
    ];
  }

  function renderChecklistItemRow(item) {
    const iconClass = item.completed
      ? "fa-solid fa-circle-check text-emerald-600"
      : item.status === "error"
      ? "fa-solid fa-triangle-exclamation text-rose-600"
      : "fa-solid fa-clock text-amber-600";

    const cardBorder = item.completed
      ? "border-emerald-200/80 bg-emerald-50/30"
      : item.status === "error"
      ? "border-rose-200 bg-rose-50/40"
      : "border-amber-200/90 bg-amber-50/30";

    const badgeStyle = item.completed
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : item.status === "error"
      ? "bg-rose-100 text-rose-800 border-rose-200"
      : "bg-amber-100 text-amber-900 border-amber-200";

    const actionBtnHtml = item.actionType
      ? `<button type="button"
           onclick="if(window.SoundEffects) SoundEffects.playClick(); window.handlePwaChecklistAction('${item.actionType}')"
           class="px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
             item.completed
               ? "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
               : "bg-navy-900 hover:bg-slate-800 text-white shadow-xs"
           }">
           <i class="fa-solid ${
             item.actionType === "send_test"
               ? "fa-paper-plane text-teal-300"
               : item.actionType === "request_permission"
               ? "fa-bell text-amber-300"
               : item.actionType === "toggle_scheduler"
               ? "fa-power-off text-emerald-300"
               : "fa-rotate text-sky-400"
           }"></i>
           <span>${item.actionLabel}</span>
         </button>`
      : "";

    return `
      <div class="rounded-xl border ${cardBorder} p-3 sm:p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
           data-checklist-item="${item.id}"
           data-browser-group="${item.browserGroupKey}"
           data-sw-group="${item.swGroupKey}">
        <div class="flex items-start gap-2.5 min-w-0">
          <span class="mt-0.5 text-sm shrink-0">
            <i class="${iconClass}"></i>
          </span>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-xs font-extrabold text-navy-900">${item.order}. ${item.title}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}">${item.badgeText}</span>
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">${item.browserGroupLabel}</span>
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">${item.swGroupLabel}</span>
            </div>
            <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">${item.description}</p>
          </div>
        </div>
        ${actionBtnHtml ? `<div class="flex items-center justify-end shrink-0">${actionBtnHtml}</div>` : ""}
      </div>
    `;
  }

  function renderBrowserSwMatrixSummary(browserProfile, swProfile, permState) {
    const browserRows = [
      {
        key: "android_webview",
        name: "Android Hibrit (APK / WebView)",
        swMode: "Native Kanal + Asset Köprüsü",
        permLabel: browserProfile.key === "android_webview" ? permState.toUpperCase() : "POST_NOTIFICATIONS"
      },
      {
        key: "chromium_chrome",
        name: "Chrome / Edge (Chromium)",
        swMode: "Service Worker (sw.js) Aktif",
        permLabel: (browserProfile.key === "chromium_chrome" || browserProfile.key === "chromium_edge") ? permState.toUpperCase() : "W3C Notification"
      },
      {
        key: "webkit_safari",
        name: "Safari / iOS WebKit PWA",
        swMode: "Ana Ekran PWA Service Worker",
        permLabel: browserProfile.key === "webkit_safari" ? permState.toUpperCase() : "Standalone PWA İzni"
      },
      {
        key: "firefox_gecko",
        name: "Mozilla Firefox (Gecko)",
        swMode: "Service Worker ShowNotification",
        permLabel: browserProfile.key === "firefox_gecko" ? permState.toUpperCase() : "Kullanıcı Etkileşimli İzin"
      }
    ];

    return `
      <div class="rounded-xl border border-slate-200 bg-white p-3 space-y-2" id="pwaBrowserSwGroupingMatrix">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-[11px] font-black text-navy-900 flex items-center gap-1.5">
            <i class="fa-solid fa-layer-group text-sky-600"></i>
            <span>Otomatik Sınıflandırma Özeti: Tarayıcı Türü × Service Worker Kayıt Durumu</span>
          </span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${swProfile.badgeClass} border">
            Aktif Ortam: ${browserProfile.shortLabel} • ${swProfile.shortLabel}
          </span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-0.5">
          ${browserRows
            .map(row => {
              const isCurrent =
                row.key === browserProfile.key ||
                (row.key === "chromium_chrome" && browserProfile.key === "chromium_edge");
              return `
                <div class="rounded-lg border p-2 text-[10px] ${
                  isCurrent
                    ? "border-teal-400 bg-teal-50/60 text-navy-900 shadow-2xs"
                    : "border-slate-200 bg-slate-50/70 text-slate-500"
                }">
                  <div class="flex items-center justify-between gap-1 font-extrabold">
                    <span class="truncate">${row.name}</span>
                    ${
                      isCurrent
                        ? '<span class="px-1.5 py-0.2 rounded bg-teal-600 text-white text-[8px] uppercase">Bu Cihaz</span>'
                        : ""
                    }
                  </div>
                  <div class="mt-1 text-[9px] text-slate-600">SW: <b>${isCurrent ? swProfile.shortLabel : row.swMode}</b></div>
                  <div class="text-[9px] text-slate-600">İzin: <b>${row.permLabel}</b></div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function renderPwaNotificationSmartChecklist() {
    const browserProfile = detectBrowserProfile();
    const swProfile = getServiceWorkerRegistrationProfile();
    const items = buildSmartChecklistItems();
    const completedCount = items.filter(i => i.completed).length;
    const totalCount = items.length;
    const pendingCount = totalCount - completedCount;
    const percent = Math.round((completedCount / totalCount) * 100);
    const permState = getEffectivePermissionState();

    // Update drawer summary badges
    const drawerSummarySubtext = document.getElementById("pwaNotifDrawerSummarySubtext");
    if (drawerSummarySubtext) {
      drawerSummarySubtext.textContent = `${browserProfile.shortLabel} • ${swProfile.shortLabel} • İzin: ${permState.toUpperCase()} (${completedCount}/${totalCount} kriter hazır, %${percent}).`;
    }

    const drawerStatusBadge = document.getElementById("pwaNotifDrawerStatusBadge");
    if (drawerStatusBadge) {
      if (completedCount === totalCount) {
        drawerStatusBadge.className = "text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200";
        drawerStatusBadge.textContent = `${browserProfile.shortLabel} • ${swProfile.shortLabel} (${completedCount}/${totalCount})`;
      } else if (permState === "granted") {
        drawerStatusBadge.className = "text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200";
        drawerStatusBadge.textContent = `${browserProfile.shortLabel} • ${completedCount}/${totalCount} Açık`;
      } else {
        drawerStatusBadge.className = "text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200";
        drawerStatusBadge.textContent = `${browserProfile.shortLabel} • ${pendingCount} Aksiyon`;
      }
    }

    const sideDrawerBadge = document.getElementById("drawerPwaSmartChecklistBadge");
    if (sideDrawerBadge) {
      sideDrawerBadge.textContent = `${completedCount}/${totalCount}`;
      sideDrawerBadge.className = completedCount === totalCount
        ? "text-[9px] px-1.5 py-0.5 rounded font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
        : "text-[9px] px-1.5 py-0.5 rounded font-black bg-amber-500/20 text-amber-300 border border-amber-500/40";
    }

    const container = document.getElementById("pwaNotifSmartChecklistContainer");
    if (!container) return;

    const filteredItems = items.filter(item => {
      if (activeFilter === "pending") return !item.completed;
      if (activeFilter === "completed") return item.completed;
      return true;
    });

    const groups = groupChecklistItems(filteredItems, browserProfile, swProfile, permState).filter(
      g => g.items.length > 0
    );

    const groupedHtml = groups.length
      ? groups
          .map(
            group => `
          <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs" data-checklist-group="${group.groupId}">
            <div class="px-3.5 py-2.5 border-b ${group.headerTone} flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <i class="${group.groupIcon} text-sm"></i>
                <div class="min-w-0">
                  <h4 class="text-xs font-black text-navy-900 truncate">${group.groupTitle}</h4>
                  <p class="text-[10px] text-slate-600 truncate">${group.groupSubtitle}</p>
                </div>
              </div>
              <span class="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-white text-navy-900 border border-slate-200 shrink-0">
                ${group.groupBadge}
              </span>
            </div>
            <div class="p-3 space-y-2">
              ${group.items.map(renderChecklistItemRow).join("")}
            </div>
          </div>
        `
          )
          .join("")
      : `<div class="rounded-xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-500">
           <i class="fa-solid fa-check-double text-emerald-500 mr-1.5"></i>Bu filtrede görüntülenecek kontrol maddesi bulunmuyor.
         </div>`;

    const deniedRecoveryHtml =
      permState === "denied"
        ? `<div class="rounded-xl border border-rose-300 bg-rose-50 p-3 text-[11px] text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
             <div>
               <strong class="font-black block"><i class="fa-solid fa-unlock-keyhole mr-1"></i>${browserProfile.shortLabel} Engellenen Bildirim İznini Kurtarma Rehberi:</strong>
               <span class="text-rose-800">${browserProfile.permissionHint}</span>
             </div>
             ${
               hasAndroidBridge()
                 ? `<button type="button" onclick="window.handlePwaChecklistAction('open_settings')" class="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-[11px] shrink-0 cursor-pointer">Ayarları Aç</button>`
                 : ""
             }
           </div>`
        : "";

    container.innerHTML = `
      <div class="space-y-3">
        <!-- Üst İlerleme Çubuğu, Gruplama Seçici ve Hızlı Aksiyonlar -->
        <div class="rounded-xl bg-white border border-slate-200 p-3.5 space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="text-xs font-black text-navy-900 flex items-center gap-1.5">
                <i class="fa-solid fa-list-check text-teal-600"></i>
                <span>PWA &amp; Mobil Bildirim Hazırlık Skoru: %${percent}</span>
              </div>
              <p class="text-[11px] text-slate-500">
                Algılanan Tarayıcı: <strong>${browserProfile.shortLabel}</strong> • SW Durumu: <strong>${swProfile.shortLabel}</strong>
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <button type="button"
                onclick="if(window.SoundEffects) SoundEffects.playClick(); window.autoConfigureAllPwaNotifications()"
                id="btnPwaNotifAutoSetup"
                class="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span>Tüm İzinleri Otomatik Etkinleştir</span>
              </button>
              <button type="button"
                onclick="if(window.SoundEffects) SoundEffects.playClick(); window.handlePwaChecklistAction('send_test')"
                id="btnPwaNotifQuickTest"
                class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-900 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 border border-slate-200">
                <i class="fa-solid fa-bell"></i>
                <span>Canlı Test Gönder</span>
              </button>
            </div>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300" style="width: ${percent}%"></div>
          </div>
          <!-- Gruplama Modu ve Durum Filtre Sekmeleri -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[10px] font-bold text-slate-500 mr-1"><i class="fa-solid fa-folder-tree mr-1"></i>Gruplama:</span>
              <button type="button"
                onclick="window.setPwaChecklistGroupBy('auto_combined')"
                class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  activeGroupBy === "auto_combined"
                    ? "bg-teal-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }">
                Otomatik (Tarayıcı + SW)
              </button>
              <button type="button"
                onclick="window.setPwaChecklistGroupBy('browser_type')"
                class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  activeGroupBy === "browser_type"
                    ? "bg-teal-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }">
                Tarayıcı Türü
              </button>
              <button type="button"
                onclick="window.setPwaChecklistGroupBy('sw_status')"
                class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  activeGroupBy === "sw_status"
                    ? "bg-teal-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }">
                SW Kayıt Durumu
              </button>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <button type="button"
                onclick="window.setPwaChecklistFilter('all')"
                class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  activeFilter === "all"
                    ? "bg-navy-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }">
                Tümü (${totalCount})
              </button>
              <button type="button"
                onclick="window.setPwaChecklistFilter('pending')"
                class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  activeFilter === "pending"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
                }">
                Bekleyen (${pendingCount})
              </button>
              <button type="button"
                onclick="window.setPwaChecklistFilter('completed')"
                class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  activeFilter === "completed"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200"
                }">
                Tamamlanan (${completedCount})
              </button>
            </div>
          </div>
        </div>
        ${renderBrowserSwMatrixSummary(browserProfile, swProfile, permState)}
        ${deniedRecoveryHtml}
        <!-- Gruplanmış Akıllı Kontrol Listesi Maddeleri -->
        <div class="space-y-3" id="pwaNotifGroupedSections">
          ${groupedHtml}
        </div>
      </div>
    `;
  }

  async function requestPermissionFromChecklist() {
    if (hasAndroidBridge()) {
      try {
        window.AndroidVitaBridge.requestNotificationPermission();
      } catch (_) {}
    }

    if ("Notification" in window && typeof Notification.requestPermission === "function") {
      try {
        const result = await Notification.requestPermission();
        if (result === "granted") {
          safeSetStorage(STORAGE_KEY_ENABLED, "true");
          if (typeof window.updateNotificationToggleUI === "function") {
            window.updateNotificationToggleUI();
          }
          if (typeof window.startNotificationScheduler === "function") {
            window.startNotificationScheduler();
          }
          if (typeof window.showToast === "function") {
            window.showToast("PWA Bildirim İzni Onaylandı", "Zamanlı dozaj ve etkileşim bildirimleri etkinleştirildi.", "success");
          }
        } else if (result === "denied" && !hasAndroidBridge()) {
          if (typeof window.showToast === "function") {
            window.showToast("İzin Engellendi", "Adres çubuğundaki kilit simgesinden bildirim iznini açabilirsiniz.", "warning");
          }
        }
      } catch (_) {}
    }

    renderPwaNotificationSmartChecklist();
  }

  async function sendTestPwaNotification() {
    const perm = getEffectivePermissionState();
    if (perm !== "granted") {
      await requestPermissionFromChecklist();
    }

    const title = "VitaTakip Pro • PWA Bildirim Testi";
    const body = "Günlük protokol dozaj hatırlatıcılarınız ve ilaç kalkanı bildirimleriniz aktif durumda.";
    let delivered = false;

    if (hasAndroidBridge() && typeof window.AndroidVitaBridge.sendNativeNotification === "function") {
      try {
        delivered = Boolean(window.AndroidVitaBridge.sendNativeNotification(title, body)) || delivered;
      } catch (_) {}
    }

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && typeof reg.showNotification === "function") {
            await reg.showNotification(title, {
              body: body,
              icon: "icons/icon-192.png",
              badge: "icons/icon-192.png",
              tag: "vitatakip-pwa-test"
            });
            delivered = true;
          }
        }
        if (!delivered) {
          new Notification(title, {
            body: body,
            icon: "icons/icon-192.png"
          });
          delivered = true;
        }
      } catch (_) {}
    }

    const nowStr = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    safeSetStorage(STORAGE_KEY_TESTED, "true");
    safeSetStorage(STORAGE_KEY_TEST_TIME, nowStr);

    if (typeof window.showToast === "function") {
      window.showToast(
        delivered ? "Canlı Test Bildirimi Gönderildi" : "Test Doğrulaması Kaydedildi",
        delivered
          ? "PWA / Mobil bildirim kanalınız üzerinden test uyarısı iletildi."
          : "Test kaydı işlendi. Cihaz bildirim izninin açık olduğundan emin olun.",
        delivered ? "success" : "info"
      );
    }

    renderPwaNotificationSmartChecklist();
  }

  async function autoConfigureAllPwaNotifications() {
    await refreshServiceWorkerState();
    await requestPermissionFromChecklist();
    if (typeof window.requestOrVerifyCameraPermission === "function") {
      try {
        await window.requestOrVerifyCameraPermission(false, "all");
      } catch (_) {}
    }
    safeSetStorage(STORAGE_KEY_ENABLED, "true");
    if (typeof window.updateNotificationToggleUI === "function") {
      window.updateNotificationToggleUI();
    }
    if (typeof window.startNotificationScheduler === "function") {
      window.startNotificationScheduler();
    }
    await sendTestPwaNotification();
    renderPwaNotificationSmartChecklist();
  }

  window.setPwaChecklistFilter = function (filter) {
    activeFilter = filter || "all";
    renderPwaNotificationSmartChecklist();
  };

  window.setPwaChecklistGroupBy = function (groupByMode) {
    activeGroupBy = groupByMode || "auto_combined";
    renderPwaNotificationSmartChecklist();
  };

  window.detectBrowserProfile = detectBrowserProfile;
  window.getServiceWorkerRegistrationProfile = getServiceWorkerRegistrationProfile;

  window.handlePwaChecklistAction = async function (actionType) {
    if (actionType === "check_sw") {
      await refreshServiceWorkerState();
      if (typeof window.showToast === "function") {
        window.showToast("Service Worker Denetlendi", "PWA servis çalışanı ve bildirim kanalı durumu güncellendi.", "info");
      }
      renderPwaNotificationSmartChecklist();
      return;
    }
    if (actionType === "request_permission") {
      await requestPermissionFromChecklist();
      return;
    }
    if (actionType === "request_camera_permission") {
      if (typeof window.requestOrVerifyCameraPermission === "function") {
        await window.requestOrVerifyCameraPermission(true, "all");
      }
      renderPwaNotificationSmartChecklist();
      return;
    }
    if (actionType === "open_camera_settings") {
      if (typeof window.openNativeAppPermissionSettings === "function") {
        window.openNativeAppPermissionSettings();
      }
      return;
    }
    if (actionType === "open_settings") {
      if (hasAndroidBridge() && typeof window.AndroidVitaBridge.openAppNotificationSettings === "function") {
        window.AndroidVitaBridge.openAppNotificationSettings();
      }
      return;
    }
    if (actionType === "toggle_scheduler") {
      const currentlyEnabled = safeGetStorage(STORAGE_KEY_ENABLED) === "true";
      if (currentlyEnabled) {
        safeSetStorage(STORAGE_KEY_ENABLED, "false");
        if (typeof window.updateNotificationToggleUI === "function") {
          window.updateNotificationToggleUI();
        }
        if (typeof window.showToast === "function") {
          window.showToast("Hatırlatıcı Kapatıldı", "Zamanlı dozaj bildirimleri duraklatıldı.", "info");
        }
      } else {
        await requestPermissionFromChecklist();
        safeSetStorage(STORAGE_KEY_ENABLED, "true");
        if (typeof window.updateNotificationToggleUI === "function") {
          window.updateNotificationToggleUI();
        }
        if (typeof window.startNotificationScheduler === "function") {
          window.startNotificationScheduler();
        }
        if (typeof window.showToast === "function") {
          window.showToast("Hatırlatıcı Motoru Açıldı", "Takviye çizelgenizdeki saatlerde bildirim üretilecek.", "success");
        }
      }
      renderPwaNotificationSmartChecklist();
      return;
    }
    if (actionType === "send_test") {
      await sendTestPwaNotification();
    }
  };

  window.autoConfigureAllPwaNotifications = autoConfigureAllPwaNotifications;
  window.renderPwaNotificationSmartChecklist = renderPwaNotificationSmartChecklist;

  window.togglePwaNotificationDrawer = function (forceOpen) {
    if (typeof window.navigateToView === "function") {
      const settingsView = document.getElementById("view-settings");
      if (settingsView && settingsView.classList.contains("hidden")) {
        window.navigateToView("view-settings");
      }
    }
    const drawer = document.getElementById("pwaNotificationSmartListDrawer");
    if (!drawer) return;
    if (typeof forceOpen === "boolean") {
      drawer.open = forceOpen;
    } else {
      drawer.open = !drawer.open;
    }
    renderPwaNotificationSmartChecklist();
    if (drawer.open) {
      setTimeout(() => {
        drawer.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    }
  };

  window.onAndroidNotificationPermissionResult = function (status) {
    if (status === "granted") {
      safeSetStorage(STORAGE_KEY_ENABLED, "true");
      if (typeof window.updateNotificationToggleUI === "function") {
        window.updateNotificationToggleUI();
      }
      if (typeof window.startNotificationScheduler === "function") {
        window.startNotificationScheduler();
      }
      if (typeof window.showToast === "function") {
        window.showToast("Bildirim İzni Verildi", "Android ve PWA bildirim izinleri aktif hale getirildi.", "success");
      }
    }
    renderPwaNotificationSmartChecklist();
  };

  function attachPermissionsChangeObserver() {
    if (permissionsApiListenerAttached) return;
    if (navigator.permissions && typeof navigator.permissions.query === "function") {
      permissionsApiListenerAttached = true;
      navigator.permissions
        .query({ name: "notifications" })
        .then(permissionStatus => {
          permissionStatus.onchange = function () {
            if (typeof window.updateNotificationToggleUI === "function") {
              window.updateNotificationToggleUI();
            }
            renderPwaNotificationSmartChecklist();
          };
        })
        .catch(() => {});
    }
  }

  async function initPwaNotificationChecklist() {
    attachPermissionsChangeObserver();
    await refreshServiceWorkerState();
    renderPwaNotificationSmartChecklist();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPwaNotificationChecklist);
  } else {
    initPwaNotificationChecklist();
  }
})();
