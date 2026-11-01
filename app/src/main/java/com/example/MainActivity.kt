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
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudQueue
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
import androidx.credentials.CredentialManager
import androidx.compose.runtime.DisposableEffect
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.data.model.Supplement
import com.example.data.model.VitalLog
import com.example.data.repository.VitaRepository
import com.example.ui.auth.authStateFlow
import com.example.ui.auth.onGoogleSignInClicked
import com.example.ui.auth.signOutUser
import com.example.ui.screens.AddSupplementDialog
import com.example.ui.screens.AddVitalLogDialog
import com.example.ui.screens.VitaAnalyticsScreen
import com.example.ui.screens.VitaDashboardScreen
import com.example.ui.screens.VitaSupplementsScreen
import com.example.ui.screens.VitaVitalsScreen
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.viewmodel.UiState
import com.example.ui.viewmodel.VitaViewModel
import com.google.firebase.Firebase
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.auth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

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

enum class VitaTab(
    val routeId: String,
    val titleRes: Int,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    OVERVIEW("overview", R.string.tab_overview, Icons.Filled.Dashboard, Icons.Outlined.Dashboard),
    SUPPLEMENTS("supplements", R.string.tab_supplements, Icons.Filled.Medication, Icons.Outlined.Medication),
    VITALS("vitals", R.string.tab_vitals, Icons.Filled.MonitorHeart, Icons.Outlined.MonitorHeart),
    ANALYTICS("analytics", R.string.tab_analytics, Icons.Filled.Analytics, Icons.Outlined.Analytics)
}

@Composable
fun AppNavigation(auth: FirebaseAuth = Firebase.auth) {
    val currentUser by auth.authStateFlow().collectAsStateWithLifecycle(initialValue = auth.currentUser)
    var showCloudNativePanel by rememberSaveable { mutableStateOf(false) }

    if (showCloudNativePanel && currentUser != null) {
        BackHandler {
            showCloudNativePanel = false
        }
        VitaMainShell(
            user = currentUser!!,
            onBackToWebPortal = { showCloudNativePanel = false }
        )
    } else {
        VitaTakipWebPortalScreen(
            currentUser = currentUser,
            onOpenCloudNativePanel = { showCloudNativePanel = true }
        )
    }
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

private class AndroidVitaBridge(
    private val context: Context,
    private val coroutineScope: CoroutineScope,
    private val webViewProvider: () -> WebView?,
    private val onOpenCloudSyncDialog: () -> Unit,
    private val onStartDirectGoogleSignIn: () -> Unit,
    private val onSignOutGoogle: () -> Unit,
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
                val escapedName = fileName.replace("'", "\\'")
                webView.evaluateJavascript(
                    "if (typeof window.onAndroidPdfSaved === 'function') { window.onAndroidPdfSaved('$escapedName'); }",
                    null
                )
            }
        }
    }

    private fun resourcesScale(ctx: Context): Float = ctx.resources.displayMetrics.density

    @JavascriptInterface
    fun openGoogleCloudSync() {
        val webView = webViewProvider() ?: return
        webView.post {
            onOpenCloudSyncDialog()
        }
    }

    @JavascriptInterface
    fun startFirebaseGoogleSignIn() {
        val webView = webViewProvider() ?: return
        webView.post {
            onStartDirectGoogleSignIn()
        }
    }

    @JavascriptInterface
    fun signOutFirebaseGoogle() {
        val webView = webViewProvider() ?: return
        webView.post {
            onSignOutGoogle()
        }
    }

    @JavascriptInterface
    fun getGoogleCloudAccountInfo(): String {
        return runCatching {
            val user = Firebase.auth.currentUser
            val prefs = context.getSharedPreferences("vitatakip_cloud_sync_prefs", Context.MODE_PRIVATE)
            if (user != null) {
                val uid = user.uid.replace("\"", "")
                val email = (user.email ?: prefs.getString("linked_email", "") ?: "").replace("\"", "")
                val name = (user.displayName ?: prefs.getString("linked_name", "") ?: "Google Kullanıcısı").replace("\"", "")
                val lastSync = prefs.getString("last_sync_${email.lowercase()}", prefs.getString("last_sync_default", "")) ?: ""
                """{"connected":true,"uid":"$uid","email":"$email","displayName":"$name","lastSync":"$lastSync","source":"firebase"}"""
            } else {
                val savedEmail = (prefs.getString("linked_email", "") ?: "").replace("\"", "")
                val savedName = (prefs.getString("linked_name", "") ?: "").replace("\"", "")
                val lastSync = prefs.getString("last_sync_${savedEmail.lowercase()}", prefs.getString("last_sync_default", "")) ?: ""
                if (savedEmail.isNotBlank()) {
                    """{"connected":true,"uid":"local_google_${savedEmail.hashCode()}","email":"$savedEmail","displayName":"$savedName","lastSync":"$lastSync","source":"linked"}"""
                } else {
                    """{"connected":false,"uid":"","email":"","displayName":"","lastSync":"","source":"none"}"""
                }
            }
        }.getOrDefault("""{"connected":false,"uid":"","email":"","displayName":"","lastSync":"","source":"none"}""")
    }

    @JavascriptInterface
    fun saveGoogleCloudAccountLink(email: String?, displayName: String?): Boolean {
        return runCatching {
            val cleanEmail = (email ?: "").trim()
            val cleanName = (displayName ?: "").trim()
            val prefs = context.getSharedPreferences("vitatakip_cloud_sync_prefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("linked_email", cleanEmail)
                .putString("linked_name", cleanName)
                .apply()
            true
        }.getOrDefault(false)
    }

    @JavascriptInterface
    fun saveCloudBackupJson(accountKey: String?, backupJson: String?): Boolean {
        if (backupJson.isNullOrBlank()) return false
        return runCatching {
            val user = Firebase.auth.currentUser
            val key = (accountKey?.takeIf { it.isNotBlank() } ?: user?.email ?: user?.uid ?: "default")
                .trim()
                .lowercase()
            val nowIso = java.text.SimpleDateFormat("dd.MM.yyyy HH:mm", java.util.Locale.getDefault()).format(java.util.Date())
            val prefs = context.getSharedPreferences("vitatakip_cloud_sync_prefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("backup_payload_$key", backupJson)
                .putString("backup_payload_default", backupJson)
                .putString("last_sync_$key", nowIso)
                .putString("last_sync_default", nowIso)
                .apply()

            if (user != null) {
                val safeName = user.displayName ?: prefs.getString("linked_name", "") ?: "Google Kullanıcısı"
                val safeEmail = user.email ?: key
                coroutineScope.launch {
                    runCatching {
                        VitaRepository(context.applicationContext).savePortalState(
                            displayName = safeName,
                            email = safeEmail,
                            payloadJson = backupJson
                        )
                    }
                }
            }
            true
        }.getOrDefault(false)
    }

    @JavascriptInterface
    fun loadCloudBackupJson(accountKey: String?): String {
        return runCatching {
            val user = Firebase.auth.currentUser
            val key = (accountKey?.takeIf { it.isNotBlank() } ?: user?.email ?: user?.uid ?: "default")
                .trim()
                .lowercase()
            val prefs = context.getSharedPreferences("vitatakip_cloud_sync_prefs", Context.MODE_PRIVATE)
            prefs.getString("backup_payload_$key", null)
                ?: prefs.getString("backup_payload_default", "")
                ?: ""
        }.getOrDefault("")
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
fun VitaTakipWebPortalScreen(
    currentUser: FirebaseUser?,
    onOpenCloudNativePanel: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val credentialManager = remember { CredentialManager.create(context) }

    var webViewRef by remember { mutableStateOf<WebView?>(null) }
    var filePathCallback by remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }
    var pendingWebPermissionRequest by remember { mutableStateOf<PermissionRequest?>(null) }
    var showCloudSyncDialog by rememberSaveable { mutableStateOf(false) }
    var isSigningIn by remember { mutableStateOf(false) }
    var authError by remember { mutableStateOf<String?>(null) }

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
                        allowUniversalAccessFromFileURLs = true
                        mediaPlaybackRequiresUserGesture = false
                        loadWithOverviewMode = false
                        useWideViewPort = false
                        builtInZoomControls = false
                        displayZoomControls = false
                        cacheMode = WebSettings.LOAD_NO_CACHE
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                    }
                    clearCache(true)

                    addJavascriptInterface(
                        AndroidVitaBridge(
                            context = ctx,
                            coroutineScope = scope,
                            webViewProvider = { webViewRef },
                            onOpenCloudSyncDialog = { showCloudSyncDialog = true },
                            onStartDirectGoogleSignIn = {
                                val existingUser = Firebase.auth.currentUser
                                if (existingUser != null) {
                                    scope.launch {
                                        val remotePayload = VitaRepository(ctx.applicationContext)
                                            .loadPortalState(existingUser.uid)
                                            .getOrNull()
                                        if (!remotePayload.isNullOrBlank()) {
                                            val emailKey = (existingUser.email ?: existingUser.uid).trim().lowercase()
                                            ctx.getSharedPreferences("vitatakip_cloud_sync_prefs", Context.MODE_PRIVATE)
                                                .edit()
                                                .putString("backup_payload_$emailKey", remotePayload)
                                                .putString("backup_payload_default", remotePayload)
                                                .apply()
                                        }
                                        val safeUid = existingUser.uid.replace("'", "\\'")
                                        val safeEmail = (existingUser.email ?: "").replace("'", "\\'")
                                        val safeName = (existingUser.displayName ?: existingUser.email?.substringBefore("@") ?: "Google Kullanıcısı").replace("'", "\\'")
                                        webViewRef?.evaluateJavascript(
                                            "if (window.onNativeGoogleAccountLinked) { window.onNativeGoogleAccountLinked('$safeUid', '$safeEmail', '$safeName', true); }",
                                            null
                                        )
                                    }
                                } else {
                                    authError = null
                                    isSigningIn = true
                                    onGoogleSignInClicked(
                                        context = context,
                                        credentialManager = credentialManager,
                                        onAuthSuccess = {
                                            isSigningIn = false
                                            showCloudSyncDialog = false
                                            val signedUser = Firebase.auth.currentUser
                                            if (signedUser != null) {
                                                scope.launch {
                                                    val remotePayload = VitaRepository(ctx.applicationContext)
                                                        .loadPortalState(signedUser.uid)
                                                        .getOrNull()
                                                    if (!remotePayload.isNullOrBlank()) {
                                                        val emailKey = (signedUser.email ?: signedUser.uid).trim().lowercase()
                                                        ctx.getSharedPreferences("vitatakip_cloud_sync_prefs", Context.MODE_PRIVATE)
                                                            .edit()
                                                            .putString("backup_payload_$emailKey", remotePayload)
                                                            .putString("backup_payload_default", remotePayload)
                                                            .apply()
                                                    }
                                                    val safeUid = signedUser.uid.replace("'", "\\'")
                                                    val safeEmail = (signedUser.email ?: "").replace("'", "\\'")
                                                    val safeName = (signedUser.displayName ?: signedUser.email?.substringBefore("@") ?: "Google Kullanıcısı").replace("'", "\\'")
                                                    webViewRef?.evaluateJavascript(
                                                        "if (window.onNativeGoogleAccountLinked) { window.onNativeGoogleAccountLinked('$safeUid', '$safeEmail', '$safeName', true); }",
                                                        null
                                                    )
                                                }
                                            }
                                        },
                                        onAuthError = { msg ->
                                            isSigningIn = false
                                            authError = msg
                                            showCloudSyncDialog = true
                                        },
                                        scope = scope,
                                        onAuthCancelled = {
                                            isSigningIn = false
                                            showCloudSyncDialog = true
                                        }
                                    )
                                }
                            },
                            onSignOutGoogle = {
                                signOutUser(
                                    credentialManager = credentialManager,
                                    onSignOutComplete = {
                                        webViewRef?.evaluateJavascript(
                                            "if (window.onNativeGoogleAccountDisconnected) { window.onNativeGoogleAccountDisconnected(); }",
                                            null
                                        )
                                    },
                                    scope = scope
                                )
                            },
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

    LaunchedEffect(currentUser, webViewRef) {
        val wv = webViewRef ?: return@LaunchedEffect
        if (currentUser != null) {
            val remotePayload = VitaRepository(context.applicationContext)
                .loadPortalState(currentUser.uid)
                .getOrNull()
            if (!remotePayload.isNullOrBlank()) {
                val emailKey = (currentUser.email ?: currentUser.uid).trim().lowercase()
                context.getSharedPreferences("vitatakip_cloud_sync_prefs", Context.MODE_PRIVATE)
                    .edit()
                    .putString("backup_payload_$emailKey", remotePayload)
                    .putString("backup_payload_default", remotePayload)
                    .apply()
            }
            val safeUid = (currentUser.uid).replace("'", "\\'")
            val safeEmail = (currentUser.email ?: "").replace("'", "\\'")
            val safeName = (currentUser.displayName ?: currentUser.email?.substringBefore("@") ?: "Google Kullanıcısı").replace("'", "\\'")
            wv.evaluateJavascript(
                "if (window.onNativeGoogleAccountLinked) { window.onNativeGoogleAccountLinked('$safeUid', '$safeEmail', '$safeName', false); }",
                null
            )
        }
    }

    if (showCloudSyncDialog) {
        AlertDialog(
            onDismissRequest = { showCloudSyncDialog = false },
            icon = {
                Icon(
                    imageVector = if (currentUser != null) Icons.Default.CloudDone else Icons.Default.CloudQueue,
                    contentDescription = "Bulut Yedekleme"
                )
            },
            title = {
                Text(
                    text = if (currentUser != null) "Google Bulut Hesabı Bağlı" else "Google Hesabı Bağla & Bulut Eşitleme",
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (currentUser != null) {
                        Text(
                            text = "Aktif Google Hesabı: ${currentUser.email ?: currentUser.displayName ?: "Kullanıcı"}"
                        )
                        Text(
                            text = "Bu Google hesabıyla VitaTakip Portalına tek tıkla giriş yapabilir, verilerinizi buluta yedekleyebilir veya Bulut Paneline geçebilirsiniz."
                        )
                    } else {
                        Text(
                            text = "VitaTakip Pro'yu Google hesabı olmadan yerel olarak kullanabilirsiniz. İsterseniz Google hesabınızı bağlayarak profil, tahlil ve takviye verilerinizi bulutla eşitleyebilirsiniz."
                        )
                        if (authError != null) {
                            Text(
                                text = authError ?: "",
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
            },
            confirmButton = {
                if (currentUser != null) {
                    Button(
                        onClick = {
                            val safeUid = (currentUser.uid).replace("'", "\\'")
                            val safeEmail = (currentUser.email ?: "").replace("'", "\\'")
                            val safeName = (currentUser.displayName ?: currentUser.email?.substringBefore("@") ?: "Google Kullanıcısı").replace("'", "\\'")
                            webViewRef?.evaluateJavascript(
                                "if (window.onNativeGoogleAccountLinked) { window.onNativeGoogleAccountLinked('$safeUid', '$safeEmail', '$safeName', true); }",
                                null
                            )
                            showCloudSyncDialog = false
                        }
                    ) {
                        Text("Portalda Eşitle & Devam Et")
                    }
                } else {
                    Button(
                        onClick = {
                            authError = null
                            isSigningIn = true
                            onGoogleSignInClicked(
                                context = context,
                                credentialManager = credentialManager,
                                onAuthSuccess = {
                                    isSigningIn = false
                                    showCloudSyncDialog = false
                                    val signedUser = Firebase.auth.currentUser
                                    if (signedUser != null) {
                                        val safeUid = (signedUser.uid).replace("'", "\\'")
                                        val safeEmail = (signedUser.email ?: "").replace("'", "\\'")
                                        val safeName = (signedUser.displayName ?: signedUser.email?.substringBefore("@") ?: "Google Kullanıcısı").replace("'", "\\'")
                                        webViewRef?.evaluateJavascript(
                                            "if (window.onNativeGoogleAccountLinked) { window.onNativeGoogleAccountLinked('$safeUid', '$safeEmail', '$safeName', true); }",
                                            null
                                        )
                                    }
                                },
                                onAuthError = { msg ->
                                    isSigningIn = false
                                    authError = msg
                                },
                                scope = scope,
                                onAuthCancelled = {
                                    isSigningIn = false
                                }
                            )
                        },
                        enabled = !isSigningIn,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (isSigningIn) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        } else {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text("Google ile Giriş Yap & Bağla")
                    }
                }
            },
            dismissButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (currentUser != null) {
                        OutlinedButton(
                            onClick = {
                                showCloudSyncDialog = false
                                onOpenCloudNativePanel()
                            }
                        ) {
                            Text("Bulut Paneli")
                        }
                        OutlinedButton(
                            onClick = {
                                signOutUser(
                                    credentialManager = credentialManager,
                                    onSignOutComplete = {
                                        webViewRef?.evaluateJavascript(
                                            "if (window.onNativeGoogleAccountDisconnected) { window.onNativeGoogleAccountDisconnected(); }",
                                            null
                                        )
                                        showCloudSyncDialog = false
                                    },
                                    scope = scope
                                )
                            }
                        ) {
                            Text("Çıkış Yap")
                        }
                    }
                    TextButton(onClick = { showCloudSyncDialog = false }) {
                        Text("Kapat")
                    }
                }
            }
        )
    }
}

@Composable
fun VitaMainShell(
    user: FirebaseUser,
    onBackToWebPortal: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val credentialManager = remember { CredentialManager.create(context) }

    val viewModel: VitaViewModel = viewModel(
        key = user.uid,
        factory = viewModelFactory {
            initializer {
                val app = checkNotNull(this[APPLICATION_KEY]) {
                    "APPLICATION_KEY missing from CreationExtras"
                }
                val databaseId = app.getString(R.string.firestore_database_id)
                val db = FirebaseFirestore.getInstance(databaseId)
                VitaViewModel(VitaRepository(db), user.uid)
            }
        }
    )

    val supplementsState by viewModel.supplementsState.collectAsStateWithLifecycle()
    val vitalLogsState by viewModel.vitalLogsState.collectAsStateWithLifecycle()
    val waterGoalMl by viewModel.waterGoalMl.collectAsStateWithLifecycle()
    val bannerMessage by viewModel.bannerMessage.collectAsStateWithLifecycle()

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(bannerMessage) {
        val msg = bannerMessage
        if (!msg.isNullOrBlank()) {
            snackbarHostState.showSnackbar(msg)
            viewModel.clearBannerMessage()
        }
    }

    var currentTab by rememberSaveable { mutableStateOf(VitaTab.OVERVIEW) }
    var showAddSupplementDialog by rememberSaveable { mutableStateOf(false) }
    var showAddVitalDialog by rememberSaveable { mutableStateOf(false) }

    if (currentTab != VitaTab.OVERVIEW) {
        BackHandler {
            currentTab = VitaTab.OVERVIEW
        }
    }

    val configuration = LocalConfiguration.current
    val isExpandedScreen = configuration.screenWidthDp >= 600

    val supplements: List<Supplement> = when (val s = supplementsState) {
        is UiState.Success -> s.data
        else -> emptyList()
    }
    val vitalLogs: List<VitalLog> = when (val v = vitalLogsState) {
        is UiState.Success -> v.data
        else -> emptyList()
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        bottomBar = {
            if (!isExpandedScreen) {
                NavigationBar(
                    modifier = Modifier
                        .windowInsetsPadding(WindowInsets.navigationBars)
                        .testTag("bottom_navigation_bar")
                ) {
                    VitaTab.entries.forEach { tab ->
                        val selected = currentTab == tab
                        NavigationBarItem(
                            selected = selected,
                            onClick = { currentTab = tab },
                            icon = {
                                Icon(
                                    imageVector = if (selected) tab.selectedIcon else tab.unselectedIcon,
                                    contentDescription = stringResource(tab.titleRes)
                                )
                            },
                            label = { Text(stringResource(tab.titleRes)) },
                            modifier = Modifier.testTag("nav_tab_${tab.routeId}")
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            if (isExpandedScreen) {
                NavigationRail(
                    modifier = Modifier.testTag("side_navigation_rail")
                ) {
                    VitaTab.entries.forEach { tab ->
                        val selected = currentTab == tab
                        NavigationRailItem(
                            selected = selected,
                            onClick = { currentTab = tab },
                            icon = {
                                Icon(
                                    imageVector = if (selected) tab.selectedIcon else tab.unselectedIcon,
                                    contentDescription = stringResource(tab.titleRes)
                                )
                            },
                            label = { Text(stringResource(tab.titleRes)) },
                            modifier = Modifier.testTag("rail_tab_${tab.routeId}")
                        )
                    }
                }
            }

            Column(modifier = Modifier.fillMaxSize()) {
                Surface(
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "VitaTakip Pro Tam Ekran Moduna Dön",
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                        TextButton(onClick = onBackToWebPortal) {
                            Text("VitaTakip Pro'yu Aç")
                        }
                    }
                }

                val errorText = (supplementsState as? UiState.Error)?.message
                    ?: (vitalLogsState as? UiState.Error)?.message
                if (errorText != null) {
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = errorText,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                        )
                    }
                }

                if (supplementsState is UiState.Loading && vitalLogsState is UiState.Loading) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                } else {
                    when (currentTab) {
                        VitaTab.OVERVIEW -> VitaDashboardScreen(
                            supplements = supplements,
                            vitalLogs = vitalLogs,
                            waterGoalMl = waterGoalMl,
                            onQuickAddWater = { viewModel.quickAddWater(it) },
                            onToggleSupplement = { viewModel.toggleSupplement(it) },
                            onOpenAddSupplement = { showAddSupplementDialog = true },
                            onOpenAddVital = { showAddVitalDialog = true },
                            onSeedStarterPack = { viewModel.seedStarterRoutinePack() },
                            onResetDailyRoutine = { viewModel.resetDailyRoutine(supplements) }
                        )

                        VitaTab.SUPPLEMENTS -> VitaSupplementsScreen(
                            supplements = supplements,
                            onToggleSupplement = { viewModel.toggleSupplement(it) },
                            onRestockSupplement = { viewModel.restockSupplement(it) },
                            onDeleteSupplement = { viewModel.deleteSupplement(it) },
                            onOpenAddDialog = { showAddSupplementDialog = true }
                        )

                        VitaTab.VITALS -> VitaVitalsScreen(
                            vitalLogs = vitalLogs,
                            onDeleteVitalLog = { viewModel.deleteVitalLog(it) },
                            onOpenAddVitalDialog = { showAddVitalDialog = true }
                        )

                        VitaTab.ANALYTICS -> VitaAnalyticsScreen(
                            userEmail = user.email,
                            userName = user.displayName,
                            supplements = supplements,
                            vitalLogs = vitalLogs,
                            waterGoalMl = waterGoalMl,
                            onUpdateWaterGoal = { viewModel.updateWaterGoal(it) },
                            onResetDailyRoutine = { viewModel.resetDailyRoutine(supplements) },
                            onSignOut = {
                                signOutUser(
                                    credentialManager = credentialManager,
                                    onSignOutComplete = onBackToWebPortal,
                                    scope = scope
                                )
                            }
                        )
                    }
                }
            }
        }
    }

    if (showAddSupplementDialog) {
        AddSupplementDialog(
            onDismiss = { showAddSupplementDialog = false },
            onConfirm = { name, dosage, category, timeOfDay, stockCount, notes ->
                showAddSupplementDialog = false
                viewModel.addSupplement(name, dosage, category, timeOfDay, stockCount, notes)
            }
        )
    }

    if (showAddVitalDialog) {
        AddVitalLogDialog(
            onDismiss = { showAddVitalDialog = false },
            onConfirm = { type, title, primaryValue, secondaryValue, unit, note ->
                showAddVitalDialog = false
                viewModel.addVitalLog(type, title, primaryValue, secondaryValue, unit, note)
            }
        )
    }
}
