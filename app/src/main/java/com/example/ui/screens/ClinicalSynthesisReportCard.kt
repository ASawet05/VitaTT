package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.MedicalInformation
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Science
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.model.BloodTestHistoryEntry
import com.example.data.model.Supplement

data class ClinicalSynthesisAlarmItem(
    val level: String, // "CRITICAL" or "WARNING"
    val title: String,
    val detail: String,
    val doctorAction: String
)

@Composable
fun ClinicalSynthesisReportCard(
    supplements: List<Supplement>,
    bloodEntries: List<BloodTestHistoryEntry>,
    modifier: Modifier = Modifier
) {
    var recentSupplementUse by remember { mutableStateOf(supplements.isNotEmpty()) }
    var pregnancyContext by remember { mutableStateOf(false) }
    var biotinExposure by remember { mutableStateOf(false) }
    var refreshRevision by remember { mutableIntStateOf(1) }
    var showDetailedAlarms by remember { mutableStateOf(true) }

    val latestEntry = bloodEntries.firstOrNull()
    val d3 = latestEntry?.values?.get("d3")
    val b12 = latestEntry?.values?.get("b12")
    val ferritin = latestEntry?.values?.get("ferritin")
    val mg = latestEntry?.values?.get("mg")

    val alarms = remember(latestEntry, supplements, recentSupplementUse, pregnancyContext, biotinExposure, refreshRevision) {
        buildList {
            if (ferritin != null && ferritin < 30f) {
                add(
                    ClinicalSynthesisAlarmItem(
                        level = if (ferritin < 15f) "CRITICAL" else "WARNING",
                        title = if (ferritin < 15f) {
                            "Kritik Demir Deposu Açığı Alarmı (Ferritin: ${ferritin.toInt()} ng/mL)"
                        } else {
                            "Sınırda / Düşük Demir Deposu Uyarısı (Ferritin: ${ferritin.toInt()} ng/mL)"
                        },
                        detail = "WHO ve AGA kılavuzlarına göre <45 ng/mL ferritin azalmış demir depolarıyla uyumludur; CRP yüksekliğinde (<70 ng/mL) akut faz maskelemesi dikkate alınmalıdır.",
                        doctorAction = "Tam kan sayımı (Hb, MCV, RDW), Transferrin Satürasyonu (TSAT) ve gizli kayıp odakları hekimce değerlendirilmelidir."
                    )
                )
            }
            if (b12 != null && b12 < 350f) {
                add(
                    ClinicalSynthesisAlarmItem(
                        level = if (b12 < 180f) "CRITICAL" else "WARNING",
                        title = "B12 Eksikliği / Nörolojik Gri Bölge Uyarısı (B12: ${b12.toInt()} pg/mL)",
                        detail = "B12 düzeyi <350 pg/mL gri bölgesindedir; parestezi/unutkanlık varlığında normal folat düzeyi megaloblastik anemiyi maskeleyebilir.",
                        doctorAction = "Holotranskobalamin (Aktif B12), Metilmalonik Asit (MMA) ve Homosistein ile doğrulama önerilir."
                    )
                )
            }
            if (d3 != null && d3 < 20f) {
                add(
                    ClinicalSynthesisAlarmItem(
                        level = "WARNING",
                        title = "25(OH) Vitamin D Eksikliği / Osteomalazi Eğilimi (D3: ${d3.toInt()} ng/mL)",
                        detail = "NIH ODS kriterlerine göre <20 ng/mL yetersizlik/eksiklik sınırındadır.",
                        doctorAction = "Replasman öncesi Serum Total Kalsiyum, Albümin ve PTH düzeyi kontrol edilmelidir (Hiperkalsemi dışlanmalıdır)."
                    )
                )
            }
            if (mg != null && mg < 1.85f) {
                add(
                    ClinicalSynthesisAlarmItem(
                        level = if (mg < 1.25f) "CRITICAL" else "WARNING",
                        title = "Hipomagnezemi & Kofaktör Açığı Uyarısı (Mg: $mg mg/dL)",
                        detail = "Düşük magnezyum nöromüsküler kramp eğilimini artırır ve D vitamini aktivasyonunu (25-hidroksilaz) kısıtlar.",
                        doctorAction = "PPI veya diüretik kullanımı ile böbrek fonksiyonları (eGFR) birlikte değerlendirilmelidir."
                    )
                )
            }
            if (biotinExposure) {
                add(
                    ClinicalSynthesisAlarmItem(
                        level = "WARNING",
                        title = "Analitik İnterferans Uyarısı: Son 72 Saatte Biotin (B7) Kullanımı",
                        detail = "Streptavidin-biotin immünoassay kitlerinde 25(OH)D, B12, Folat ve Serbest T4 sahte yüksek; TSH sahte düşük ölçülebilir.",
                        doctorAction = "Şüpheli hormon/vitamin sonuçları 72 saatlik biotin kesintisi ardından tekrarlanmalıdır."
                    )
                )
            }
            if (pregnancyContext) {
                add(
                    ClinicalSynthesisAlarmItem(
                        level = "WARNING",
                        title = "Gebelik / Laktasyon Fizyolojik Referans Kayması Aktif",
                        detail = "Gebelikte dilüsyonel Hb eşiği <11,0 g/dL'dir ve serum kreatinin >0,85 mg/dL böbrek fonksiyon kaybı/preeklampsi açısından alarm niteliğindedir.",
                        doctorAction = "Standart yetişkin CKD-EPI formülü gebelikte kullanılmaz; Kadın Doğum ve Dahiliye takibi esastır."
                    )
                )
            }
        }
    }

    val supplementNames = supplements.map { it.name.lowercase() }
    val hasIronAndCalciumOrMg = supplementNames.any { it.contains("demir") || it.contains("iron") } &&
        supplementNames.any { it.contains("kalsiyum") || it.contains("magnezyum") || it.contains("çinko") }

    val summaryText = remember(latestEntry, supplements, alarms, recentSupplementUse, pregnancyContext, biotinExposure, refreshRevision) {
        buildString {
            append("1. Klinik Profil & Biyokimyasal Triyaj: ")
            if (latestEntry != null) {
                append("Son tahlil kaydı (${latestEntry.dateLabel}) üzerinden yapılan İç Hastalıkları denetiminde ")
                append("D3: ${d3?.toInt() ?: "-"} ng/mL, B12: ${b12?.toInt() ?: "-"} pg/mL, Ferritin: ${ferritin?.toInt() ?: "-"} ng/mL, Magnezyum: ${mg ?: "-"} mg/dL değerlendirilmiştir. ")
            } else {
                append("Henüz laboratuvar kaydı girilmemiştir; semptom ve ilaç profili üzerinden ön değerlendirme yapılmıştır. ")
            }
            append("\n\n2. Klinik Alarm & Referans Dışı Bulgular: ")
            if (alarms.isNotEmpty()) {
                append("Toplam ${alarms.size} klinik dikkat/alarm bulgusu (${alarms.map { it.title }.joinToString("; ")}) saptanmıştır. ")
            } else {
                append("Mevcut kayıtlarda akut panik eşiğinde biyokimyasal alarm saptanmamıştır. ")
            }
            append("\n\n3. Kronik İlaç & Etkileşim Kalkanı Sentezi: ")
            if (hasIronAndCalciumOrMg) {
                append("Aktif protokolde Demir ile divalan katyon (Kalsiyum/Magnezyum/Çinko) birlikteliği mevcuttur; DMT1 taşıyıcı blokajını önlemek için en az 3-4 saatlik zaman ayrımı uygulanmalıdır.")
            } else if (supplements.isNotEmpty()) {
                append("Kayıtlı ${supplements.size} ürün (${supplements.joinToString(", ") { it.name }}) için majör şelasyon çakışması görülmemektedir; hekim onayıyla zamanlama sürdürülmelidir.")
            } else {
                append("Kayıtlı aktif ilaç/takviye protokolü bulunmamaktadır.")
            }
        }
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("clinical_synthesis_report_card"),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .background(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = RoundedCornerShape(12.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.MedicalInformation,
                            contentDescription = "Uzman Dahiliye Klinik Sentez İkonu",
                            tint = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Uzman Dahiliye Klinik Sentez & Alarm Raporu",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Prof. Dr. perspektifiyle belirti, referans dışı tahlil ve ilaç etkileşim sentezi",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(50),
                    color = if (alarms.any { it.level == "CRITICAL" }) {
                         Color(0xFFFEE2E2)
                    } else if (alarms.isNotEmpty()) {
                        Color(0xFFFEF3C7)
                    } else {
                        Color(0xFFD1FAE5)
                    }
                ) {
                    Text(
                        text = if (alarms.isNotEmpty()) "${alarms.size} Alarm / Uyarı" else "Stabil",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = if (alarms.any { it.level == "CRITICAL" }) {
                            Color(0xFF991B1B)
                        } else if (alarms.isNotEmpty()) {
                            Color(0xFF92400E)
                        } else {
                            Color(0xFF065F46)
                        },
                        modifier = Modifier
                            .padding(horizontal = 10.dp, vertical = 5.dp)
                            .testTag("clinical_synthesis_alarm_badge")
                    )
                }
            }

            // Pre-analytical context filter chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = recentSupplementUse,
                    onClick = { recentSupplementUse = !recentSupplementUse },
                    label = { Text("Son 3 Ay Takviye", style = MaterialTheme.typography.labelSmall) },
                    modifier = Modifier.testTag("chip_recent_supplement")
                )
                FilterChip(
                    selected = pregnancyContext,
                    onClick = { pregnancyContext = !pregnancyContext },
                    label = { Text("Gebelik Fizyolojisi", style = MaterialTheme.typography.labelSmall) },
                    modifier = Modifier.testTag("chip_pregnancy_context")
                )
                FilterChip(
                    selected = biotinExposure,
                    onClick = { biotinExposure = !biotinExposure },
                    label = { Text("Biotin (B7) Alımı", style = MaterialTheme.typography.labelSmall) },
                    modifier = Modifier.testTag("chip_biotin_exposure")
                )
            }

            // Structured Executive Pre-Summary Narrative
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                        shape = RoundedCornerShape(14.dp)
                    )
                    .border(
                        width = 1.dp,
                        color = MaterialTheme.colorScheme.outlineVariant,
                        shape = RoundedCornerShape(14.dp)
                    )
                    .padding(14.dp)
                    .testTag("clinical_synthesis_summary_box"),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Science,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = "Yapılandırılmış Hekim Konsültasyon Ön Özet Metni",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold
                    )
                }
                Text(
                    text = summaryText,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            // Clinical Alarms list
            AnimatedVisibility(visible = showDetailedAlarms && alarms.isNotEmpty()) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.testTag("clinical_synthesis_alarms_list")
                ) {
                    HorizontalDivider()
                    Text(
                        text = "Klinik Alarm Durumları & Biyolojik Referans Denetimi",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.error
                    )
                    alarms.forEach { alarm ->
                        val isCritical = alarm.level == "CRITICAL"
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    color = if (isCritical) Color(0xFFFEF2F2) else Color(0xFFFFFBEB),
                                    shape = RoundedCornerShape(12.dp)
                                )
                                .border(
                                    width = 1.dp,
                                    color = if (isCritical) Color(0xFFFCA5A5) else Color(0xFFFDE68A),
                                    shape = RoundedCornerShape(12.dp)
                                )
                                .padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = if (isCritical) Icons.Default.Warning else Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = if (isCritical) Color(0xFFB91C1C) else Color(0xFFB45309),
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = alarm.title,
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isCritical) Color(0xFF7F1D1D) else Color(0xFF78350F)
                                )
                            }
                            Text(
                                text = alarm.detail,
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF334155)
                            )
                            Text(
                                text = "Hekim Eylem Önerisi: ${alarm.doctorAction}",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = if (isCritical) Color(0xFF991B1B) else Color(0xFF92400E)
                            )
                        }
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                FilledTonalButton(
                    onClick = { showDetailedAlarms = !showDetailedAlarms },
                    modifier = Modifier.testTag("btn_toggle_synthesis_alarms")
                ) {
                    Text(if (showDetailedAlarms) "Alarm Detaylarını Gizle" else "Alarm Detaylarını Göster")
                }

                FilledTonalButton(
                    onClick = { refreshRevision++ },
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    ),
                    modifier = Modifier.testTag("btn_regenerate_clinical_synthesis")
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Sentezi Güncelle")
                }
            }
        }
    }
}
