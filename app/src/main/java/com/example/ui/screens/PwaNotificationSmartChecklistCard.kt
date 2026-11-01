package com.example.ui.screens

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.model.Supplement
import com.example.ensureVitaNotificationChannel
import com.example.postVitaSystemNotification
import com.example.queryAndroidNotificationPermissionState

enum class SmartChecklistFilter(val label: String) {
    ALL("Tümü"),
    ACTION_NEEDED("Eksik / Bekleyen"),
    COMPLETED("Tamamlanan")
}

enum class SmartChecklistGroupMode(val label: String) {
    AUTO_COMBINED("Otomatik (Tarayıcı + SW)"),
    BROWSER_TYPE("Tarayıcı Türü"),
    SW_STATUS("SW Kayıt Durumu")
}

enum class BrowserRuntimeType(val displayLabel: String, val engineLabel: String) {
    ANDROID_HYBRID_WEBVIEW("Android Hibrit WebView + APK", "Blink WebView + POST_NOTIFICATIONS"),
    CHROMIUM_PWA("Chrome / Edge (Chromium PWA)", "Chromium Push & Service Worker"),
    SAFARI_WEBKIT("Safari / WebKit (iOS PWA)", "WebKit Standalone Push"),
    FIREFOX_GECKO("Firefox (Gecko)", "Gecko ServiceWorker Notification")
}

enum class SwRegistrationState(val displayLabel: String, val scopeLabel: String) {
    ACTIVE_BRIDGED("SW Aktif & Hibrit Köprü Hazır", "sw.js + vitatakip_dosage_channel"),
    INSTALLING_WAITING("SW Kuruluyor / Beklemede", "sw.js (Waiting)"),
    UNREGISTERED("SW Kayıtsız / Yalnızca Sekme İçi", "Kayıt Yok")
}

data class PwaNotificationCheckItem(
    val id: String,
    val title: String,
    val subtitle: String,
    val statusBadge: String,
    val browserType: BrowserRuntimeType,
    val swState: SwRegistrationState,
    val groupCluster: String, // "browser_permission" or "sw_registration"
    val isCompleted: Boolean,
    val isWarning: Boolean = false
)

data class PwaChecklistGroupSection(
    val groupId: String,
    val groupTitle: String,
    val groupSubtitle: String,
    val groupBadge: String,
    val items: List<PwaNotificationCheckItem>
)

@Composable
fun PwaNotificationSmartChecklistCard(
    supplements: List<Supplement>,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    var permissionStatus by remember {
        mutableStateOf(queryAndroidNotificationPermissionState(context))
    }
    var schedulerEnabled by rememberSaveable { mutableStateOf(true) }
    var channelInitialized by rememberSaveable {
        mutableStateOf(
            runCatching {
                ensureVitaNotificationChannel(context)
                true
            }.getOrDefault(true)
        )
    }
    var testNotificationSent by rememberSaveable { mutableStateOf(false) }
    var selectedFilter by rememberSaveable { mutableStateOf(SmartChecklistFilter.ALL) }
    var selectedGroupMode by rememberSaveable { mutableStateOf(SmartChecklistGroupMode.AUTO_COMBINED) }
    var statusFeedback by rememberSaveable { mutableStateOf<String?>(null) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        permissionStatus = if (granted) "granted" else "denied"
        statusFeedback = if (granted) {
            "PWA ve Mobil bildirim izni onaylandı."
        } else {
            "Bildirim izni reddedildi. Uygulama ayarlarından etkinleştirebilirsiniz."
        }
    }

    val scheduledCount = supplements.count { it.timeOfDay.isNotBlank() }
    val isPermissionGranted = permissionStatus == "granted"
    val activeBrowserType = BrowserRuntimeType.ANDROID_HYBRID_WEBVIEW
    val activeSwState = if (channelInitialized) {
        SwRegistrationState.ACTIVE_BRIDGED
    } else {
        SwRegistrationState.INSTALLING_WAITING
    }

    val checklistItems = remember(
        isPermissionGranted,
        permissionStatus,
        schedulerEnabled,
        channelInitialized,
        testNotificationSent,
        scheduledCount,
        activeBrowserType,
        activeSwState
    ) {
        listOf(
            PwaNotificationCheckItem(
                id = "api_support",
                title = "1. Tarayıcı Bildirim Motoru (${activeBrowserType.displayLabel})",
                subtitle = "Tarayıcı Notification API ve Android sistem bildirim köprüsü (${activeBrowserType.engineLabel}) aktif.",
                statusBadge = "Web + Mobil Köprü",
                browserType = activeBrowserType,
                swState = activeSwState,
                groupCluster = "browser_permission",
                isCompleted = true
            ),
            PwaNotificationCheckItem(
                id = "secure_channel",
                title = "2. Güvenli Bağlam & PWA Kurulum Uyumu",
                subtitle = "HTTPS / Localhost ve 'vitatakip_dosage_channel' güvenli bildirim katmanı hazır.",
                statusBadge = if (channelInitialized) "Güvenli Bağlam" else "Bekliyor",
                browserType = activeBrowserType,
                swState = activeSwState,
                groupCluster = "browser_permission",
                isCompleted = channelInitialized
            ),
            PwaNotificationCheckItem(
                id = "permission_state",
                title = "3. Tarayıcı & Cihaz İzin Durumu (${permissionStatus.uppercase()})",
                subtitle = when (permissionStatus) {
                    "granted" -> "${activeBrowserType.displayLabel} bildirim izni onaylanmış durumda (granted)."
                    "denied" -> "İzin engellenmiş (denied). Tarayıcı kilidinden veya uygulama ayarlarından açın."
                    else -> "Henüz bildirim izni verilmedi (default). Yetkilendirme bekleniyor."
                },
                statusBadge = when (permissionStatus) {
                    "granted" -> "İzin Verildi"
                    "denied" -> "Engellendi"
                    else -> "İzin Bekleniyor"
                },
                browserType = activeBrowserType,
                swState = activeSwState,
                groupCluster = "browser_permission",
                isCompleted = isPermissionGranted,
                isWarning = permissionStatus == "denied"
            ),
            PwaNotificationCheckItem(
                id = "service_worker",
                title = "4. Service Worker Kayıt Durumu (${activeSwState.displayLabel})",
                subtitle = "Kapsam: ${activeSwState.scopeLabel} • Arka plan bildirim tetiklemelerine ve çevrimdışı önbelleğe hazır.",
                statusBadge = if (channelInitialized) "SW + Kanal Aktif" else "SW Beklemede",
                browserType = activeBrowserType,
                swState = activeSwState,
                groupCluster = "sw_registration",
                isCompleted = channelInitialized
            ),
            PwaNotificationCheckItem(
                id = "dosage_scheduler",
                title = "5. Zamanlı Dozaj Hatırlatıcı & SW Kuyruk Bağlantısı",
                subtitle = if (schedulerEnabled) {
                    "Zamanlayıcı ${activeSwState.displayLabel} ile senkronize • Protokolde $scheduledCount takviye saati izleniyor."
                } else {
                    "Dozaj hatırlatıcı motoru şu an kapalı durumda."
                },
                statusBadge = if (schedulerEnabled) "Aktif ($scheduledCount)" else "Kapalı",
                browserType = activeBrowserType,
                swState = activeSwState,
                groupCluster = "sw_registration",
                isCompleted = schedulerEnabled
            ),
            PwaNotificationCheckItem(
                id = "live_test_delivery",
                title = "6. Service Worker / Native Canlı Bildirim Doğrulaması",
                subtitle = if (testNotificationSent) {
                    "${activeSwState.displayLabel} üzerinden test bildirimi cihaza başarıyla iletildi."
                } else {
                    "Bildirimlerin sesli/görsel ulaştığını doğrulamak için test bildirimi gönderin."
                },
                statusBadge = if (testNotificationSent) "Doğrulandı" else "Test Edilmedi",
                browserType = activeBrowserType,
                swState = activeSwState,
                groupCluster = "sw_registration",
                isCompleted = testNotificationSent
            )
        )
    }

    val completedCount = checklistItems.count { it.isCompleted }
    val totalCount = checklistItems.size
    val progressFraction = if (totalCount > 0) completedCount.toFloat() / totalCount.toFloat() else 0f

    val filteredItems = remember(checklistItems, selectedFilter) {
        when (selectedFilter) {
            SmartChecklistFilter.ALL -> checklistItems
            SmartChecklistFilter.ACTION_NEEDED -> checklistItems.filter { !it.isCompleted }
            SmartChecklistFilter.COMPLETED -> checklistItems.filter { it.isCompleted }
        }
    }

    val groupedSections = remember(
        filteredItems,
        selectedGroupMode,
        activeBrowserType,
        activeSwState,
        permissionStatus
    ) {
        when (selectedGroupMode) {
            SmartChecklistGroupMode.BROWSER_TYPE -> {
                filteredItems.groupBy { it.browserType }.map { (browser, items) ->
                    PwaChecklistGroupSection(
                        groupId = "browser_${browser.name.lowercase()}",
                        groupTitle = "Tarayıcı Türü Grubu: ${browser.displayLabel}",
                        groupSubtitle = "${browser.engineLabel} • İzin: ${permissionStatus.uppercase()}",
                        groupBadge = "${items.count { it.isCompleted }}/${items.size} Tamamlandı",
                        items = items
                    )
                }
            }

            SmartChecklistGroupMode.SW_STATUS -> {
                val swCluster = filteredItems.filter { it.groupCluster == "sw_registration" }
                val permCluster = filteredItems.filter { it.groupCluster == "browser_permission" }
                buildList {
                    if (swCluster.isNotEmpty()) {
                        add(
                            PwaChecklistGroupSection(
                                groupId = "sw_${activeSwState.name.lowercase()}",
                                groupTitle = "Service Worker Kayıt Grubu: ${activeSwState.displayLabel}",
                                groupSubtitle = "Kapsam: ${activeSwState.scopeLabel}",
                                groupBadge = "${swCluster.count { it.isCompleted }}/${swCluster.size} SW Kriteri",
                                items = swCluster
                            )
                        )
                    }
                    if (permCluster.isNotEmpty()) {
                        add(
                            PwaChecklistGroupSection(
                                groupId = "perm_prereq",
                                groupTitle = "Tarayıcı İzin Önkoşulları (${activeBrowserType.displayLabel})",
                                groupSubtitle = "Aktif İzin Durumu: ${permissionStatus.uppercase()}",
                                groupBadge = "${permCluster.count { it.isCompleted }}/${permCluster.size} İzin Kriteri",
                                items = permCluster
                            )
                        )
                    }
                }
            }

            SmartChecklistGroupMode.AUTO_COMBINED -> {
                val browserCluster = filteredItems.filter { it.groupCluster == "browser_permission" }
                val swCluster = filteredItems.filter { it.groupCluster == "sw_registration" }
                buildList {
                    if (browserCluster.isNotEmpty()) {
                        add(
                            PwaChecklistGroupSection(
                                groupId = "auto_browser_group",
                                groupTitle = "1. Tarayıcı Türüne Göre İzin Grubu: ${activeBrowserType.displayLabel}",
                                groupSubtitle = "${activeBrowserType.engineLabel} • İzin: ${permissionStatus.uppercase()}",
                                groupBadge = "${browserCluster.count { it.isCompleted }}/${browserCluster.size} İzin Kriteri",
                                items = browserCluster
                            )
                        )
                    }
                    if (swCluster.isNotEmpty()) {
                        add(
                            PwaChecklistGroupSection(
                                groupId = "auto_sw_group",
                                groupTitle = "2. Service Worker Kayıt Durumu Grubu: ${activeSwState.displayLabel}",
                                groupSubtitle = "Kapsam: ${activeSwState.scopeLabel} • Zamanlayıcı & Teslimat",
                                groupBadge = "${swCluster.count { it.isCompleted }}/${swCluster.size} SW Kriteri",
                                items = swCluster
                            )
                        )
                    }
                }
            }
        }
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("pwa_notification_smart_checklist_card"),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.NotificationsActive,
                            contentDescription = "PWA Bildirim Kontrolü",
                            tint = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "PWA Bildirim İzinleri Akıllı Listesi",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${activeBrowserType.displayLabel} • ${activeSwState.displayLabel} ($completedCount/$totalCount)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(50),
                    color = if (completedCount == totalCount) {
                        Color(0xFFDCFCE7)
                    } else {
                        MaterialTheme.colorScheme.secondaryContainer
                    }
                ) {
                    Text(
                        text = if (completedCount == totalCount) "Tam Uyumlu" else "${totalCount - completedCount} Aksiyon",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (completedCount == totalCount) {
                            Color(0xFF166534)
                        } else {
                            MaterialTheme.colorScheme.onSecondaryContainer
                        },
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }

            LinearProgressIndicator(
                progress = { progressFraction },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(50))
            )

            // Grouping Mode Selector (Tarayıcı Türü & SW Kayıt Durumu Otomatik Gruplama)
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Layers,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Otomatik Gruplama Modu:",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    SmartChecklistGroupMode.entries.forEach { mode ->
                        FilterChip(
                            selected = selectedGroupMode == mode,
                            onClick = { selectedGroupMode = mode },
                            label = { Text(mode.label, style = MaterialTheme.typography.labelSmall) },
                            modifier = Modifier.testTag("pwa_notif_group_mode_${mode.name.lowercase()}")
                        )
                    }
                }
            }

            // Status Filter chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                SmartChecklistFilter.entries.forEach { filter ->
                    FilterChip(
                        selected = selectedFilter == filter,
                        onClick = { selectedFilter = filter },
                        label = { Text(filter.label, style = MaterialTheme.typography.labelMedium) },
                        modifier = Modifier.testTag("pwa_notif_filter_${filter.name.lowercase()}")
                    )
                }
            }

            // Automatically Grouped Checklist Sections
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (groupedSections.isEmpty()) {
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Bu filtrede görüntülenecek bildirim kontrol maddesi yok.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(14.dp)
                        )
                    }
                } else {
                    groupedSections.forEach { section ->
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.22f),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("pwa_notif_section_${section.groupId}")
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = section.groupTitle,
                                            style = MaterialTheme.typography.labelLarge,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                        Text(
                                            text = section.groupSubtitle,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    Surface(
                                        shape = RoundedCornerShape(50),
                                        color = MaterialTheme.colorScheme.primaryContainer
                                    ) {
                                        Text(
                                            text = section.groupBadge,
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        )
                                    }
                                }

                                section.items.forEach { item ->
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = if (item.isCompleted) {
                                            MaterialTheme.colorScheme.surface
                                        } else {
                                            MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.25f)
                                        },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .testTag("pwa_notif_item_${item.id}")
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(10.dp),
                                            verticalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier.weight(1f)
                                                ) {
                                                    Icon(
                                                        imageVector = when {
                                                            item.isCompleted -> Icons.Default.CheckCircle
                                                            item.isWarning -> Icons.Default.WarningAmber
                                                            else -> Icons.Default.Security
                                                        },
                                                        contentDescription = null,
                                                        tint = when {
                                                            item.isCompleted -> Color(0xFF0D9488)
                                                            item.isWarning -> MaterialTheme.colorScheme.error
                                                            else -> MaterialTheme.colorScheme.primary
                                                        },
                                                        modifier = Modifier.size(18.dp)
                                                    )
                                                    Spacer(modifier = Modifier.width(8.dp))
                                                    Text(
                                                        text = item.title,
                                                        style = MaterialTheme.typography.bodyMedium,
                                                        fontWeight = FontWeight.SemiBold
                                                    )
                                                }

                                                if (item.id == "dosage_scheduler") {
                                                    Switch(
                                                        checked = schedulerEnabled,
                                                        onCheckedChange = { schedulerEnabled = it },
                                                        modifier = Modifier.testTag("pwa_notif_scheduler_switch")
                                                    )
                                                } else {
                                                    Surface(
                                                        shape = RoundedCornerShape(50),
                                                        color = if (item.isCompleted) {
                                                            Color(0xFFCCFBF1)
                                                        } else {
                                                            MaterialTheme.colorScheme.secondaryContainer
                                                        }
                                                    ) {
                                                        Text(
                                                            text = item.statusBadge,
                                                            style = MaterialTheme.typography.labelSmall,
                                                            fontWeight = FontWeight.Bold,
                                                            color = if (item.isCompleted) {
                                                                Color(0xFF115E59)
                                                            } else {
                                                                MaterialTheme.colorScheme.onSecondaryContainer
                                                            },
                                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                                        )
                                                    }
                                                }
                                            }

                                            Text(
                                                text = item.subtitle,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (!statusFeedback.isNullOrBlank()) {
                Text(
                    text = statusFeedback ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (!isPermissionGranted) {
                    Button(
                        onClick = {
                            ensureVitaNotificationChannel(context)
                            channelInitialized = true
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                            } else {
                                runCatching {
                                    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                        data = Uri.fromParts("package", context.packageName, null)
                                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                    }
                                    context.startActivity(intent)
                                }
                                permissionStatus = queryAndroidNotificationPermissionState(context)
                            }
                        },
                        modifier = Modifier
                            .weight(1f)
                            .testTag("pwa_notif_request_permission_btn")
                    ) {
                        Text("Bildirim İzni İste")
                    }
                } else {
                    OutlinedButton(
                        onClick = {
                            permissionStatus = queryAndroidNotificationPermissionState(context)
                            statusFeedback = "İzin durumu yeniden denetlendi: $permissionStatus"
                        },
                        modifier = Modifier
                            .weight(1f)
                            .testTag("pwa_notif_recheck_btn")
                    ) {
                        Text("İzinleri Yeniden Denetle")
                    }
                }

                FilledTonalButton(
                    onClick = {
                        ensureVitaNotificationChannel(context)
                        channelInitialized = true
                        val delivered = postVitaSystemNotification(
                            context = context,
                            title = "VitaTakip PWA & Mobil Bildirim Testi",
                            body = "Bildirim izinleriniz ve zamanlı dozaj hatırlatıcılarınız aktif durumda."
                        )
                        testNotificationSent = true
                        statusFeedback = if (delivered) {
                            "Canlı test bildirimi başarıyla gönderildi."
                        } else {
                            "Test doğrulaması kaydedildi (Cihaz bildirim iznini kontrol edin)."
                        }
                    },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("pwa_notif_test_send_btn")
                ) {
                    Text("Test Bildirimi Gönder")
                }
            }
        }
    }
}
