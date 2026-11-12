package com.example

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color as AndroidColor
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.Settings
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.MimeTypeMap
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.MonitorHeart
import androidx.compose.material.icons.outlined.Analytics
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.Medication
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.compose.runtime.DisposableEffect
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.ui.theme.MyApplicationTheme

import java.io.File

private fun prepareWebViewVariationsDirectory(context: Context) {
    runCatching {
        val candidateDirs = listOfNotNull(
            context.getDir("webview", Context.MODE_PRIVATE),
            context.applicationInfo?.dataDir?.let { File(it, "app_webview") }
        ).distinctBy { it.absolutePath }

        val now = System.currentTimeMillis()
        for (dir in candidateDirs) {
            if (!dir.exists()) {
                dir.mkdirs()
            }
            listOf("variations_seed", "variations_seed_new", "variations_seed_temp").forEach { fileName ->
                val seedFile = File(dir, fileName)
                if (seedFile.exists()) {
                    seedFile.delete()
                }
            }
            val stampFile = File(dir, "variations_stamp")
            if (!stampFile.exists()) {
                stampFile.createNewFile()
            }
            stampFile.setLastModified(now)
        }
    }
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        prepareWebViewVariationsDirectory(applicationContext)
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                AppNavigation()
            }
        }
    }
}

/** Uygulama tamamen cihaz içinde çalışır: hesap, bulut veya sunucu bağlantısı yoktur. */
@Composable
fun AppNavigation() {
    VitaTakipWebPortalScreen()
}

const val VITA_NOTIFICATION_CHANNEL_ID = "vitatakip_dosage_channel"

fun ensureVitaNotificationChannel(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        val existing = manager.getNotificationChannel(VITA_NOTIFICATION_CHANNEL_ID)
        if (existing == null) {
            val channel = NotificationChannel(
                VITA_NOTIFICATION_CHANNEL_ID,
                "VitaTakip Dozaj ve Sağlık Hatırlatmaları",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Günlük takviye saatleri, ilaç etkileşim uyarıları ve su hedefi hatırlatmaları"
            }
            manager.createNotificationChannel(channel)
        }
    }
}

fun queryAndroidNotificationPermissionState(context: Context): String {
    val managerEnabled = runCatching {
        NotificationManagerCompat.from(context).areNotificationsEnabled()
    }.getOrDefault(true)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        val granted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
        return if (granted && managerEnabled) "granted" else "default"
    }
    return if (managerEnabled) "granted" else "denied"
}

fun queryAndroidCameraPermissionState(context: Context): String {
    val granted = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.CAMERA
    ) == PackageManager.PERMISSION_GRANTED
    return if (granted) "granted" else "default"
}

@SuppressLint("MissingPermission")
fun postVitaSystemNotification(context: Context, title: String, body: String): Boolean {
    if (queryAndroidNotificationPermissionState(context) != "granted") {
        return false
    }
    return runCatching {
        ensureVitaNotificationChannel(context)
        val notification = NotificationCompat.Builder(context, VITA_NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title.ifBlank { "VitaTakip Dozaj Hatırlatıcı" })
            .setContentText(body.ifBlank { "Günlük protokolünüzdeki takviye saatini kontrol edin." })
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(context)
            .notify((System.currentTimeMillis() % 100000).toInt(), notification)
        true
    }.getOrDefault(false)
}

/** Metin dosyasını İndirilenler klasörüne yazar; başarılıysa kaydedilen dosya adını döner. */
fun saveTextToDownloads(context: Context, fileName: String?, mimeType: String?, content: String): String? {
    val safeName = (fileName ?: "VitaTakip.json")
        .replace(Regex("[\\\\/:*?\"<>|]+"), "_")
        .take(120)
        .ifBlank { "VitaTakip.json" }
    val mime = mimeType?.takeIf { it.isNotBlank() } ?: "application/json"
    val bytes = content.toByteArray(Charsets.UTF_8)
    return runCatching {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = android.content.ContentValues().apply {
                put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, safeName)
                put(android.provider.MediaStore.MediaColumns.MIME_TYPE, mime)
                put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS)
            }
            val resolver = context.contentResolver
            val uri = resolver.insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: return@runCatching null
            resolver.openOutputStream(uri)?.use { it.write(bytes) } ?: return@runCatching null
            safeName
        } else {
            // Android 9 ve öncesi: izin gerektirmeyen uygulamaya özel İndirilenler klasörü
            val dir = context.getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS) ?: context.filesDir
            File(dir, safeName).writeBytes(bytes)
            safeName
        }
    }.getOrNull()
}

private class AndroidVitaBridge(
    private val context: Context,
    private val webViewProvider: () -> WebView?,
    private val onRequestNotificationPermission: () -> Unit,
    private val onRequestCameraPermission: () -> Unit
) {
    @JavascriptInterface
    fun printPage() {
        printPageWithTitle("VitaTakip_Klinik_Rapor")
    }

    private tailrec fun Context.findActivity(): android.app.Activity? = when (this) {
        is android.app.Activity -> this
        is android.content.ContextWrapper -> baseContext.findActivity()
        else -> null
    }

    @JavascriptInterface
    fun printPageWithTitle(jobTitle: String?) {
        val webView = webViewProvider() ?: return
        val rawTitle = jobTitle?.takeIf { it.isNotBlank() } ?: "VitaTakip_Klinik_Rapor"
        val safeTitle = rawTitle.replace(Regex("[^a-zA-Z0-9_\\-]"), "_").take(80).ifBlank { "VitaTakip_Klinik_Rapor" }
        val fileName = "${safeTitle}.pdf"

        webView.post {
            var savedPdfSuccess = false
            try {
                val viewWidth = webView.width.takeIf { it > 0 } ?: 1080
                @Suppress("DEPRECATION")
                val scale = if (webView.scale > 0f) webView.scale else resourcesScale(webView.context)
                val totalContentHeightPx = ((webView.contentHeight * scale).toInt()).coerceAtLeast(webView.height.coerceAtLeast(1400))

                val pageWidthPt = 595
                val pageHeightPt = 842
                val scaleFactor = pageWidthPt.toFloat() / viewWidth.toFloat()
                val scaledContentHeightPt = (totalContentHeightPx * scaleFactor).toInt().coerceAtLeast(pageHeightPt)
                val pageCount = ((scaledContentHeightPt + pageHeightPt - 1) / pageHeightPt).coerceIn(1, 12)

                val pdfDocument = android.graphics.pdf.PdfDocument()
                for (pageIndex in 0 until pageCount) {
                    val pageInfo = android.graphics.pdf.PdfDocument.PageInfo.Builder(pageWidthPt, pageHeightPt, pageIndex + 1).create()
                    val page = pdfDocument.startPage(pageInfo)
                    val canvas = page.canvas
                    canvas.save()
                    canvas.translate(0f, -(pageIndex * pageHeightPt).toFloat())
                    canvas.scale(scaleFactor, scaleFactor)
                    webView.draw(canvas)
                    canvas.restore()
                    pdfDocument.finishPage(page)
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val resolver = context.contentResolver
                    val contentValues = android.content.ContentValues().apply {
                        put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                        put(android.provider.MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                        put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS)
                    }
                    val uri = resolver.insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                    if (uri != null) {
                        resolver.openOutputStream(uri)?.use { outStream ->
                            pdfDocument.writeTo(outStream)
                            savedPdfSuccess = true
                        }
                    }
                }
                if (!savedPdfSuccess) {
                    val fallbackDir = context.getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS) ?: context.cacheDir
                    val outFile = java.io.File(fallbackDir, fileName)
                    java.io.FileOutputStream(outFile).use { outStream ->
                        pdfDocument.writeTo(outStream)
                        savedPdfSuccess = true
                    }
                }
                pdfDocument.close()
            } catch (_: Exception) {
                // Continue to PrintManager even if direct PDF capture encounters an issue
            }

            try {
                val hostContext = context.findActivity() ?: webView.context.findActivity() ?: context
                val printManager = hostContext.getSystemService(Context.PRINT_SERVICE) as? PrintManager
                val printAdapter = webView.createPrintDocumentAdapter(safeTitle)
                val printAttributes = PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setResolution(PrintAttributes.Resolution("pdf", "PDF", 300, 300))
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build()
                printManager?.print(safeTitle, printAdapter, printAttributes)
            } catch (e: Exception) {
                if (!savedPdfSuccess) {
                    Toast.makeText(context, "PDF / Yazdırma başlatılamadı: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                }
            }

            if (savedPdfSuccess) {
                Toast.makeText(context, "PDF indirildi: İndirilenler/$fileName", Toast.LENGTH_LONG).show()
                webView.evaluateJavascript(
                    "if (typeof window.onAndroidPdfSaved === 'function') { window.onAndroidPdfSaved(${org.json.JSONObject.quote(fileName)}); }",
                    null
                )
            }
        }
    }

    private fun resourcesScale(ctx: Context): Float = ctx.resources.displayMetrics.density

    /**
     * Yedek / FHIR / geri bildirim dosyalarını cihazın İndirilenler klasörüne yazar.
     * WebView, `data:` ve `blob:` indirmelerini kendiliğinden kaydetmediği için web arayüzü bu köprüyü kullanır.
     */
    @JavascriptInterface
    fun saveTextFile(fileName: String?, mimeType: String?, content: String?): Boolean {
        if (content == null) return false
        val saved = saveTextToDownloads(context, fileName, mimeType, content)
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            Toast.makeText(
                context,
                if (saved != null) "Kaydedildi: İndirilenler/$saved" else "Dosya kaydedilemedi",
                Toast.LENGTH_LONG
            ).show()
        }
        return saved != null
    }

    @JavascriptInterface
    fun getNotificationPermissionStatus(): String {
        return queryAndroidNotificationPermissionState(context)
    }

    @JavascriptInterface
    fun requestNotificationPermission() {
        val webView = webViewProvider() ?: return
        webView.post {
            onRequestNotificationPermission()
        }
    }

    @JavascriptInterface
    fun sendNativeNotification(title: String?, body: String?): Boolean {
        val safeTitle = title?.takeIf { it.isNotBlank() } ?: "VitaTakip Dozaj Hatırlatıcı"
        val safeBody = body?.takeIf { it.isNotBlank() } ?: "Günlük protokolünüzdeki takviye zamanı geldi."
        return postVitaSystemNotification(context, safeTitle, safeBody)
    }

    @JavascriptInterface
    fun openAppNotificationSettings() {
        val webView = webViewProvider() ?: return
        webView.post {
            runCatching {
                val intent = Intent().apply {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        action = Settings.ACTION_APP_NOTIFICATION_SETTINGS
                        putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                    } else {
                        action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
                        data = Uri.fromParts("package", context.packageName, null)
                    }
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }
        }
    }

    @JavascriptInterface
    fun getCameraPermissionStatus(): String {
        return queryAndroidCameraPermissionState(context)
    }

    @JavascriptInterface
    fun requestCameraPermission() {
        val webView = webViewProvider() ?: return
        webView.post {
            onRequestCameraPermission()
        }
    }

    @JavascriptInterface
    fun openAppPermissionSettings() {
        val webView = webViewProvider() ?: return
        webView.post {
            runCatching {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", context.packageName, null)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }
        }
    }

    @JavascriptInterface
    fun sendFeedbackEmail(subject: String?, body: String?): Boolean {
        val webView = webViewProvider() ?: return false
        return runCatching {
            val safeSubject = subject?.takeIf { it.isNotBlank() } ?: "VitaTakip Geri Bildirim ve Öneri"
            val safeBody = body ?: ""
            webView.post {
                runCatching {
                    val uri = Uri.parse(
                        "mailto:samet1975bjk@gmail.com?subject=" +
                            Uri.encode(safeSubject) +
                            "&body=" +
                            Uri.encode(safeBody)
                    )
                    val intent = Intent(Intent.ACTION_SENDTO, uri).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                }.onFailure {
                    runCatching {
                        val fallbackIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "message/rfc822"
                            putExtra(Intent.EXTRA_EMAIL, arrayOf("samet1975bjk@gmail.com"))
                            putExtra(Intent.EXTRA_SUBJECT, safeSubject)
                            putExtra(Intent.EXTRA_TEXT, safeBody)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        context.startActivity(Intent.createChooser(fallbackIntent, "Geri Bildirimi Gönder").apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        })
                    }
                }
            }
            true
        }.getOrDefault(false)
    }
}

private fun resolveAssetMimeType(path: String): String {
    val lower = path.lowercase()
    return when {
        lower.endsWith(".html") || lower.endsWith(".htm") -> "text/html"
        lower.endsWith(".css") -> "text/css"
        lower.endsWith(".js") || lower.endsWith(".mjs") -> "application/javascript"
        lower.endsWith(".json") || lower.endsWith(".webmanifest") -> "application/json"
        lower.endsWith(".png") -> "image/png"
        lower.endsWith(".jpg") || lower.endsWith(".jpeg") -> "image/jpeg"
        lower.endsWith(".webp") -> "image/webp"
        lower.endsWith(".svg") -> "image/svg+xml"
        lower.endsWith(".woff2") -> "font/woff2"
        lower.endsWith(".woff") -> "font/woff"
        lower.endsWith(".ttf") -> "font/ttf"
        else -> {
            val ext = MimeTypeMap.getFileExtensionFromUrl(path)
            MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: "application/octet-stream"
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun VitaTakipWebPortalScreen() {
    val context = LocalContext.current

    var webViewRef by remember { mutableStateOf<WebView?>(null) }
    var filePathCallback by remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }
    var pendingWebPermissionRequest by remember { mutableStateOf<PermissionRequest?>(null) }
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenMultipleDocuments()
    ) { uris: List<Uri> ->
        val callback = filePathCallback
        filePathCallback = null
        if (uris.isNotEmpty()) {
            callback?.onReceiveValue(uris.toTypedArray())
        } else {
            callback?.onReceiveValue(null)
        }
    }

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        val status = if (isGranted) "granted" else "denied"
        webViewRef?.evaluateJavascript(
            "if (window.onAndroidNotificationPermissionResult) { window.onAndroidNotificationPermissionResult('$status'); }",
            null
        )
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        val status = if (isGranted) "granted" else "denied"
        val pendingReq = pendingWebPermissionRequest
        pendingWebPermissionRequest = null
        if (pendingReq != null) {
            runCatching {
                if (isGranted) {
                    pendingReq.grant(pendingReq.resources)
                } else {
                    pendingReq.deny()
                }
            }
        }
        webViewRef?.evaluateJavascript(
            "if (window.onAndroidCameraPermissionResult) { window.onAndroidCameraPermissionResult('$status'); }",
            null
        )
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner, webViewRef) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                webViewRef?.evaluateJavascript(
                    """
                    if (typeof window.updateCameraPermissionUI === 'function') { window.updateCameraPermissionUI(); }
                    if (typeof window.updateNotificationToggleUI === 'function') { window.updateNotificationToggleUI(); }
                    if (typeof window.renderPwaSmartNotificationChecklist === 'function') { window.renderPwaSmartNotificationChecklist(); }
                    """.trimIndent(),
                    null
                )
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    BackHandler {
        val wv = webViewRef
        if (wv != null) {
            wv.evaluateJavascript(
                """
                (function() {
                    var activeModals = document.querySelectorAll('.modal-overlay.active, .wizard-overlay.active, #visualRefModal.active');
                    if (activeModals && activeModals.length > 0) {
                        var lastModal = activeModals[activeModals.length - 1];
                        lastModal.classList.remove('active');
                        lastModal.setAttribute('aria-hidden', 'true');
                        return 'CLOSED_MODAL';
                    }
                    var homeView = document.getElementById('view-home');
                    if (homeView && homeView.classList.contains('hidden') && typeof navigateToView === 'function') {
                        navigateToView('view-home');
                        return 'NAV_HOME';
                    }
                    return 'NONE';
                })();
                """.trimIndent()
            ) { result ->
                if (result == "\"NONE\"" && wv.canGoBack()) {
                    wv.goBack()
                }
            }
        }
    }

    Surface(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing),
        color = MaterialTheme.colorScheme.background
    ) {
        AndroidView(
            modifier = Modifier
                .fillMaxSize()
                .testTag("vita_takip_webview"),
            factory = { ctx ->
                prepareWebViewVariationsDirectory(ctx)
                object : WebView(ctx) {
                    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
                        val widthSize = MeasureSpec.getSize(widthMeasureSpec)
                        val heightSize = MeasureSpec.getSize(heightMeasureSpec)
                        val exactWidth = if (widthSize > 0) {
                            MeasureSpec.makeMeasureSpec(widthSize, MeasureSpec.EXACTLY)
                        } else {
                            widthMeasureSpec
                        }
                        val exactHeight = if (heightSize > 0) {
                            MeasureSpec.makeMeasureSpec(heightSize, MeasureSpec.EXACTLY)
                        } else {
                            heightMeasureSpec
                        }
                        super.onMeasure(exactWidth, exactHeight)
                    }
                }.apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    setBackgroundColor(AndroidColor.parseColor("#F8FAFC"))
                    isVerticalScrollBarEnabled = true
                    isHorizontalScrollBarEnabled = false
                    webViewRef = this

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        @Suppress("DEPRECATION")
                        databaseEnabled = true
                        allowFileAccess = true
                        allowContentAccess = true
                        @Suppress("DEPRECATION")
                        allowFileAccessFromFileURLs = true
                        @Suppress("DEPRECATION")
                        allowUniversalAccessFromFileURLs = false // yerel sayfa her siteye sınırsız erişemez (güvenlik)
                        mediaPlaybackRequiresUserGesture = false
                        loadWithOverviewMode = false
                        useWideViewPort = false
                        builtInZoomControls = false
                        displayZoomControls = false
                        cacheMode = WebSettings.LOAD_NO_CACHE
                        mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW // şifresiz http içerik yüklenmez
                    }
                    clearCache(true)

                    // Yedek: web arayüzü köprüyü kullanamazsa gelen data: indirmeleri de İndirilenler'e yazılır.
                    setDownloadListener { url, _, contentDisposition, mimeType, _ ->
                        val saved = if (url.startsWith("data:")) {
                            runCatching {
                                val comma = url.indexOf(',')
                                val meta = url.substring(5, comma)
                                val payload = url.substring(comma + 1)
                                val text = if (meta.contains(";base64")) {
                                    String(android.util.Base64.decode(payload, android.util.Base64.DEFAULT), Charsets.UTF_8)
                                } else {
                                    Uri.decode(payload)
                                }
                                val name = Regex("filename=\"?([^\";]+)").find(contentDisposition ?: "")?.groupValues?.get(1)
                                    ?: "VitaTakip_${System.currentTimeMillis()}.json"
                                saveTextToDownloads(ctx, name, mimeType ?: meta.substringBefore(';'), text)
                            }.getOrNull()
                        } else null
                        Toast.makeText(
                            ctx,
                            if (saved != null) "Kaydedildi: İndirilenler/$saved" else "Bu dosya uygulama içinden indirilemiyor",
                            Toast.LENGTH_LONG
                        ).show()
                    }

                    addJavascriptInterface(
                        AndroidVitaBridge(
                            context = ctx,
                            webViewProvider = { webViewRef },
                            onRequestNotificationPermission = {
                                ensureVitaNotificationChannel(ctx)
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                    val alreadyGranted = ContextCompat.checkSelfPermission(
                                        ctx,
                                        Manifest.permission.POST_NOTIFICATIONS
                                    ) == PackageManager.PERMISSION_GRANTED
                                    if (alreadyGranted) {
                                        webViewRef?.evaluateJavascript(
                                            "if (window.onAndroidNotificationPermissionResult) { window.onAndroidNotificationPermissionResult('granted'); }",
                                            null
                                        )
                                    } else {
                                        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                                    }
                                } else {
                                    val state = queryAndroidNotificationPermissionState(ctx)
                                    webViewRef?.evaluateJavascript(
                                        "if (window.onAndroidNotificationPermissionResult) { window.onAndroidNotificationPermissionResult('$state'); }",
                                        null
                                    )
                                }
                            },
                            onRequestCameraPermission = {
                                val alreadyGranted = ContextCompat.checkSelfPermission(
                                    ctx,
                                    Manifest.permission.CAMERA
                                ) == PackageManager.PERMISSION_GRANTED
                                if (alreadyGranted) {
                                    webViewRef?.evaluateJavascript(
                                        "if (window.onAndroidCameraPermissionResult) { window.onAndroidCameraPermissionResult('granted'); }",
                                        null
                                    )
                                } else {
                                    cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                                }
                            }
                        ),
                        "AndroidVitaBridge"
                    )

                    webViewClient = object : WebViewClient() {
                        override fun shouldInterceptRequest(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): WebResourceResponse? {
                            val url = request?.url ?: return super.shouldInterceptRequest(view, request)
                            if (url.host == "appassets.androidplatform.net") {
                                val rawPath = (url.path ?: "").removePrefix("/")
                                val assetPath = when {
                                    rawPath.startsWith("assets/") -> rawPath.removePrefix("assets/")
                                    rawPath.isEmpty() -> "vita_web/index.html"
                                    else -> "vita_web/$rawPath"
                                }
                                return try {
                                    val inputStream = ctx.assets.open(assetPath)
                                    val mime = resolveAssetMimeType(assetPath)
                                    val encoding = if (
                                        mime.startsWith("text/") ||
                                        mime == "application/javascript" ||
                                        mime == "application/json" ||
                                        mime == "image/svg+xml"
                                    ) "UTF-8" else null
                                    WebResourceResponse(mime, encoding, inputStream)
                                } catch (e: Exception) {
                                    null
                                }
                            }
                            return super.shouldInterceptRequest(view, request)
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            view?.evaluateJavascript(
                                """
                                (function() {
                                    if (window.AndroidVitaBridge) {
                                        window.print = function() {
                                            window.AndroidVitaBridge.printPage();
                                        };
                                    }
                                })();
                                """.trimIndent(),
                                null
                            )
                        }

                        /* Uygulama dış sitelere bağlanmaz: http(s) bağlantıları uygulama içinde açılmaz,
                           yalnızca kullanıcı isterse cihazın kendi tarayıcısına devredilir. */
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): Boolean {
                            val target = request?.url ?: return false
                            val scheme = target.scheme?.lowercase()
                            if (scheme == "file" || target.host == "appassets.androidplatform.net") return false
                            runCatching {
                                context.startActivity(Intent(Intent.ACTION_VIEW, target).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                            }
                            return true
                        }
                    }

                    webChromeClient = object : WebChromeClient() {
                        override fun onShowFileChooser(
                            webView: WebView?,
                            filePathCallbackParam: ValueCallback<Array<Uri>>?,
                            fileChooserParams: FileChooserParams?
                        ): Boolean {
                            filePathCallback?.onReceiveValue(null)
                            filePathCallback = filePathCallbackParam
                            try {
                                filePickerLauncher.launch(
                                    arrayOf(
                                        "application/pdf",
                                        "application/json",
                                        "text/*",
                                        "image/*"
                                    )
                                )
                            } catch (e: Exception) {
                                filePathCallback?.onReceiveValue(null)
                                filePathCallback = null
                                return false
                            }
                            return true
                        }

                        override fun onPermissionRequest(request: PermissionRequest?) {
                            if (request == null) return
                            val needsCamera = request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
                            if (needsCamera && ContextCompat.checkSelfPermission(ctx, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                                pendingWebPermissionRequest = request
                                cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                            } else {
                                request.grant(request.resources)
                            }
                        }
                    }

                    loadUrl("file:///android_asset/vita_web/index.html?v=32")
                }
            },
            update = { webView ->
                if (webView.layoutParams?.width != ViewGroup.LayoutParams.MATCH_PARENT ||
                    webView.layoutParams?.height != ViewGroup.LayoutParams.MATCH_PARENT
                ) {
                    webView.layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                }
                webViewRef = webView
            }
        )
    }
}
