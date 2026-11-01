package com.example.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.LocalDrink
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.MonitorHeart
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.model.BloodTestBiomarkerSpec
import com.example.data.model.BloodTestHistoryEntry
import com.example.data.model.BloodTestTrendCatalog
import com.example.data.model.ClinicalInteractionAlert
import com.example.data.model.ClinicalInteractionEngine
import com.example.data.model.InteractionSeverity
import com.example.data.model.Supplement
import com.example.data.model.SupplementCategory
import com.example.data.model.TimeOfDaySlot
import com.example.data.model.VitalLog
import com.example.ui.theme.VitaCoralHeart
import com.example.ui.theme.VitaEmeraldDark
import com.example.ui.theme.VitaEmeraldDeepBg
import com.example.ui.theme.VitaGoldAccent
import com.example.ui.theme.VitaMintLight
import com.example.ui.theme.VitaSkyWater
import java.text.SimpleDateFormat
import java.util.Locale

@Composable
fun VitaDashboardScreen(
    supplements: List<Supplement>,
    vitalLogs: List<VitalLog>,
    waterGoalMl: Long,
    onQuickAddWater: (Long) -> Unit,
    onToggleSupplement: (Supplement) -> Unit,
    onOpenAddSupplement: () -> Unit,
    onOpenAddVital: () -> Unit,
    onSeedStarterPack: () -> Unit,
    onResetDailyRoutine: () -> Unit
) {
    val takenCount = supplements.count { it.takenToday }
    val totalSupplements = supplements.size
    val totalWaterMl = vitalLogs.filter { it.type == "Su" }.sumOf { it.primaryValue }
    val waterFraction = (totalWaterMl.toFloat() / waterGoalMl.coerceAtLeast(1L)).coerceIn(0f, 1f)
    val supplementFraction = if (totalSupplements > 0) {
        takenCount.toFloat() / totalSupplements.toFloat()
    } else {
        0f
    }
    val vitaScore = ((supplementFraction * 60f) + (waterFraction * 40f)).toInt().coerceIn(0, 100)
    val interactionAlerts = remember(supplements) {
        ClinicalInteractionEngine.evaluateInteractions(supplements)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("dashboard_list"),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            VitaHeroBannerCard(
                vitaScore = vitaScore,
                takenCount = takenCount,
                totalSupplements = totalSupplements,
                totalWaterMl = totalWaterMl,
                waterGoalMl = waterGoalMl,
                vitalCount = vitalLogs.size
            )
        }

        if (supplements.isEmpty() && vitalLogs.isEmpty()) {
            item {
                StarterPackPromptCard(
                    onSeedStarterPack = onSeedStarterPack,
                    onOpenAddSupplement = onOpenAddSupplement
                )
            }
        }

        item {
            WaterTrackerCard(
                currentWaterMl = totalWaterMl,
                goalWaterMl = waterGoalMl,
                waterFraction = waterFraction,
                onAdd250 = { onQuickAddWater(250L) },
                onAdd500 = { onQuickAddWater(500L) }
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Bugünün Vitamin & İlaç Rutini",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "$takenCount / $totalSupplements doz tamamlandı",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (supplements.any { it.takenToday }) {
                        IconButton(
                            onClick = onResetDailyRoutine,
                            modifier = Modifier.testTag("reset_daily_routine_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = stringResource(R.string.reset_daily_routine)
                            )
                        }
                    }
                    FilledTonalButton(
                        onClick = onOpenAddSupplement,
                        modifier = Modifier.testTag("dashboard_add_supplement_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Ekle")
                    }
                }
            }
        }

        if (interactionAlerts.isNotEmpty()) {
            item {
                DailyProtocolInteractionAlertCard(alerts = interactionAlerts)
            }
        }

        if (supplements.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.Medication,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(36.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = stringResource(R.string.empty_supplements_title),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = stringResource(R.string.empty_supplements_desc),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            items(supplements, key = { it.id.ifEmpty { it.name + it.timeOfDay } }) { supplement ->
                DashboardSupplementItemCard(
                    supplement = supplement,
                    onToggle = { onToggleSupplement(supplement) }
                )
            }
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Son Vital & Sağlık Kayıtları",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Tansiyon, nabız, şeker, uyku ve sağlık giderleri",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                FilledTonalButton(
                    onClick = onOpenAddVital,
                    modifier = Modifier.testTag("dashboard_add_vital_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Ölçüm")
                }
            }
        }

        val recentVitals = vitalLogs.take(5)
        if (recentVitals.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.MonitorHeart,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.size(36.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = stringResource(R.string.empty_vitals_title),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        } else {
            items(recentVitals, key = { it.id.ifEmpty { it.title + it.primaryValue } }) { log ->
                DashboardVitalSummaryRow(log = log)
            }
        }
    }
}

@Composable
private fun VitaHeroBannerCard(
    vitaScore: Int,
    takenCount: Int,
    totalSupplements: Int,
    totalWaterMl: Long,
    waterGoalMl: Long,
    vitalCount: Int
) {
    val animatedSweep by animateFloatAsState(
        targetValue = (vitaScore / 100f) * 360f,
        animationSpec = tween(durationMillis = 650),
        label = "vitaScoreSweep"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("vita_hero_banner_card"),
        shape = RoundedCornerShape(28.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            VitaEmeraldDeepBg,
                            VitaEmeraldDark,
                            Color(0xFF0F5243)
                        )
                    )
                )
                .padding(22.dp)
        ) {
            // Decorative background canvas arcs
            Canvas(modifier = Modifier.matchParentSize()) {
                drawCircle(
                    color = VitaMintLight.copy(alpha = 0.08f),
                    radius = size.minDimension * 0.65f,
                    center = Offset(size.width * 0.9f, size.height * 0.15f)
                )
                drawCircle(
                    color = VitaGoldAccent.copy(alpha = 0.07f),
                    radius = size.minDimension * 0.45f,
                    center = Offset(size.width * 0.1f, size.height * 0.9f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Surface(
                        color = VitaMintLight.copy(alpha = 0.18f),
                        shape = RoundedCornerShape(50)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Favorite,
                                contentDescription = null,
                                tint = VitaMintLight,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "VİTA TAKİP PRO",
                                style = MaterialTheme.typography.labelMedium,
                                color = VitaMintLight,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = stringResource(R.string.vita_score_label),
                        style = MaterialTheme.typography.headlineMedium,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "Dozlar: $takenCount/$totalSupplements • Su: $totalWaterMl/$waterGoalMl ml • Kayıt: $vitalCount",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.82f)
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Box(
                    modifier = Modifier.size(96.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val strokeWidth = 10.dp.toPx()
                        drawArc(
                            color = Color.White.copy(alpha = 0.14f),
                            startAngle = -90f,
                            sweepAngle = 360f,
                            useCenter = false,
                            style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                        )
                        drawArc(
                            brush = Brush.sweepGradient(
                                listOf(VitaMintLight, VitaGoldAccent, VitaSkyWater, VitaMintLight)
                            ),
                            startAngle = -90f,
                            sweepAngle = animatedSweep,
                            useCenter = false,
                            style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                        )
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "$vitaScore",
                            style = MaterialTheme.typography.headlineLarge,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "PUAN",
                            style = MaterialTheme.typography.labelMedium,
                            color = VitaGoldAccent,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StarterPackPromptCard(
    onSeedStarterPack: () -> Unit,
    onOpenAddSupplement: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSecondaryContainer
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "Hızlı Başlangıç Paketi",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSecondaryContainer
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "D3+K2, Omega-3, C Vitamini, Magnezyum ve örnek vital ölçümleri tek dokunuşla hesabınıza yükleyebilirsiniz.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.85f)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = onSeedStarterPack,
                    modifier = Modifier.testTag("seed_starter_pack_button")
                ) {
                    Text(stringResource(R.string.seed_starter_pack))
                }
                OutlinedButton(onClick = onOpenAddSupplement) {
                    Text("Kendin Ekle")
                }
            }
        }
    }
}

@Composable
private fun WaterTrackerCard(
    currentWaterMl: Long,
    goalWaterMl: Long,
    waterFraction: Float,
    onAdd250: () -> Unit,
    onAdd500: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("water_tracker_card"),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(VitaSkyWater.copy(alpha = 0.16f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocalDrink,
                            contentDescription = "Su Takibi",
                            tint = VitaSkyWater,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = stringResource(R.string.water_tracker_title),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "$currentWaterMl / $goalWaterMl ml (${(waterFraction * 100).toInt()}%)",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            LinearProgressIndicator(
                progress = { waterFraction },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(10.dp)
                    .clip(RoundedCornerShape(50)),
                color = VitaSkyWater,
                trackColor = VitaSkyWater.copy(alpha = 0.15f)
            )

            Spacer(modifier = Modifier.height(14.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = onAdd250,
                    modifier = Modifier
                        .weight(1f)
                        .testTag("quick_add_water_250"),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = VitaSkyWater,
                        contentColor = Color.White
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(stringResource(R.string.quick_add_250))
                }
                FilledTonalButton(
                    onClick = onAdd500,
                    modifier = Modifier
                        .weight(1f)
                        .testTag("quick_add_water_500")
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(stringResource(R.string.quick_add_500))
                }
            }
        }
    }
}

@Composable
private fun DashboardSupplementItemCard(
    supplement: Supplement,
    onToggle: () -> Unit
) {
    val category = SupplementCategory.fromCode(supplement.category)
    val slot = TimeOfDaySlot.fromCode(supplement.timeOfDay)
    val isLowStock = supplement.stockCount <= 5L

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onToggle)
            .testTag("supplement_card_${supplement.id}"),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (supplement.takenToday) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.65f)
            } else {
                MaterialTheme.colorScheme.surface
            }
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onToggle,
                modifier = Modifier.testTag("toggle_supplement_${supplement.id}")
            ) {
                Icon(
                    imageVector = if (supplement.takenToday) {
                        Icons.Default.CheckCircle
                    } else {
                        Icons.Default.RadioButtonUnchecked
                    },
                    contentDescription = if (supplement.takenToday) "Alındı" else "Alınmadı",
                    tint = if (supplement.takenToday) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                    modifier = Modifier.size(28.dp)
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = supplement.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    textDecoration = if (supplement.takenToday) TextDecoration.LineThrough else TextDecoration.None,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${supplement.dosage} • ${category.displayLabel} • ${slot.displayLabel}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (!supplement.notes.isNullOrBlank()) {
                    Text(
                        text = supplement.notes,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Surface(
                color = if (isLowStock) {
                    VitaCoralHeart.copy(alpha = 0.16f)
                } else {
                    MaterialTheme.colorScheme.surfaceVariant
                },
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (isLowStock) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = "Azalan Stok",
                            tint = VitaCoralHeart,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                    }
                    Text(
                        text = "${supplement.stockCount} adet",
                        style = MaterialTheme.typography.labelMedium,
                        color = if (isLowStock) VitaCoralHeart else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}

@Composable
private fun DashboardVitalSummaryRow(log: VitalLog) {
    val dateFormat = SimpleDateFormat("dd MMM HH:mm", Locale.forLanguageTag("tr-TR"))
    val dateText = log.createdAt?.toDate()?.let { dateFormat.format(it) } ?: "Yeni"
    val valueDisplay = if (log.type == "Tansiyon" && log.secondaryValue > 0L) {
        "${log.primaryValue}/${log.secondaryValue} ${log.unit}"
    } else {
        "${log.primaryValue} ${log.unit}"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = log.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "${log.type} • $dateText" + (log.note?.let { " • $it" } ?: ""),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Surface(
                color = MaterialTheme.colorScheme.primaryContainer,
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = valueDisplay,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
        }
    }
}

@Composable
private fun DailyProtocolInteractionAlertCard(
    alerts: List<ClinicalInteractionAlert>
) {
    val hasCritical = alerts.any { it.severity == InteractionSeverity.CRITICAL }
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("daily_protocol_interaction_alert_card"),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (hasCritical) {
                MaterialTheme.colorScheme.errorContainer
            } else {
                MaterialTheme.colorScheme.tertiaryContainer
            }
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = "İlaç Besin Etkileşim Uyarısı",
                    tint = if (hasCritical) {
                        MaterialTheme.colorScheme.onErrorContainer
                    } else {
                        MaterialTheme.colorScheme.onTertiaryContainer
                    }
                )
                Column {
                    Text(
                        text = "Klinik İlaç–Besin Etkileşim Uyarısı (${alerts.size})",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (hasCritical) {
                            MaterialTheme.colorScheme.onErrorContainer
                        } else {
                            MaterialTheme.colorScheme.onTertiaryContainer
                        }
                    )
                    Text(
                        text = "Günlük Protokol gerçek zamanlı etkileşim denetimi (NIH ODS • Lexicomp)",
                        style = MaterialTheme.typography.labelMedium,
                        color = if (hasCritical) {
                            MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.85f)
                        } else {
                            MaterialTheme.colorScheme.onTertiaryContainer.copy(alpha = 0.85f)
                        }
                    )
                }
            }

            alerts.forEach { alert ->
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = alert.title,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = alert.mechanism,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "Öneri: ${alert.recommendation}",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BloodTestMultiLineDashboardCard(
    entries: List<BloodTestHistoryEntry>,
    biomarkers: List<BloodTestBiomarkerSpec>
) {
    var selectedKeys by remember {
        mutableStateOf(setOf("d3", "b12", "ferritin", "hb"))
    }
    var selectedDateIndex by remember(entries.size) {
        mutableStateOf((entries.size - 1).coerceAtLeast(0))
    }

    val activeSpecs = remember(selectedKeys, biomarkers) {
        biomarkers.filter { it.key in selectedKeys }
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("dashboard_blood_test_multiline_chart_card"),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "Kan Tahlili Geçmişi & Çoklu Çizgi Grafiği (Recharts)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Zaman içindeki D3, B12, Ferritin, Hemoglobin, Magnezyum ve Folat ilerlemenizi karşılaştırın",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                biomarkers.forEach { spec ->
                    val isSelected = spec.key in selectedKeys
                    FilterChip(
                        selected = isSelected,
                        onClick = {
                            if (isSelected && selectedKeys.size > 1) {
                                selectedKeys = selectedKeys - spec.key
                            } else if (!isSelected) {
                                selectedKeys = selectedKeys + spec.key
                            }
                        },
                        label = {
                            Text(
                                text = spec.label,
                                style = MaterialTheme.typography.labelMedium
                            )
                        },
                        leadingIcon = {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .clip(CircleShape)
                                    .background(Color(spec.colorHex))
                            )
                        },
                        modifier = Modifier.testTag("blood_chart_chip_${spec.key}")
                    )
                }
            }

            // Multi-line Canvas Chart (Normalized Reference Progress -20%..130%)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
                    .padding(horizontal = 16.dp, vertical = 14.dp)
                    .testTag("dashboard_blood_test_multiline_canvas")
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val yMin = -20f
                    val yMax = 130f
                    val ySpan = yMax - yMin

                    fun yForPercent(pct: Float): Float {
                        val clamped = pct.coerceIn(yMin, yMax)
                        val ratio = (clamped - yMin) / ySpan
                        return size.height - (ratio * size.height)
                    }

                    fun xForIndex(index: Int): Float {
                        if (entries.size <= 1) return size.width / 2f
                        return (index.toFloat() / (entries.size - 1).toFloat()) * size.width
                    }

                    // Optimal reference band (0% to 100%)
                    val yRefTop = yForPercent(100f)
                    val yRefBottom = yForPercent(0f)
                    drawRect(
                        color = Color(0xFF0D9488).copy(alpha = 0.08f),
                        topLeft = Offset(0f, yRefTop),
                        size = androidx.compose.ui.geometry.Size(size.width, (yRefBottom - yRefTop).coerceAtLeast(0f))
                    )

                    val dashEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
                    drawLine(
                        color = Color(0xFF0D9488).copy(alpha = 0.55f),
                        start = Offset(0f, yRefTop),
                        end = Offset(size.width, yRefTop),
                        strokeWidth = 2f,
                        pathEffect = dashEffect
                    )
                    drawLine(
                        color = Color(0xFFD97706).copy(alpha = 0.65f),
                        start = Offset(0f, yRefBottom),
                        end = Offset(size.width, yRefBottom),
                        strokeWidth = 2f,
                        pathEffect = dashEffect
                    )

                    // Draw each selected biomarker line and points
                    activeSpecs.forEach { spec ->
                        val lineColor = Color(spec.colorHex)
                        val points = entries.mapIndexedNotNull { idx, entry ->
                            val pct = entry.normalizedPercent(spec) ?: return@mapIndexedNotNull null
                            Offset(xForIndex(idx), yForPercent(pct))
                        }
                        if (points.size >= 2) {
                            val path = Path().apply {
                                moveTo(points.first().x, points.first().y)
                                for (i in 0 until points.size - 1) {
                                    val p0 = points[i]
                                    val p1 = points[i + 1]
                                    val cpx1 = p0.x + (p1.x - p0.x) * 0.45f
                                    val cpx2 = p0.x + (p1.x - p0.x) * 0.55f
                                    cubicTo(cpx1, p0.y, cpx2, p1.y, p1.x, p1.y)
                                }
                            }
                            drawPath(
                                path = path,
                                color = lineColor,
                                style = Stroke(width = 6f, cap = StrokeCap.Round)
                            )
                        }
                        points.forEach { pt ->
                            drawCircle(
                                color = Color.White,
                                radius = 7f,
                                center = pt
                            )
                            drawCircle(
                                color = lineColor,
                                radius = 5f,
                                center = pt
                            )
                        }
                    }
                }
            }

            // Date selector row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                entries.forEachIndexed { idx, entry ->
                    val isSelectedDate = idx == selectedDateIndex
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { selectedDateIndex = idx }
                            .testTag("blood_chart_date_$idx"),
                        color = if (isSelectedDate) {
                            MaterialTheme.colorScheme.primaryContainer
                        } else {
                            Color.Transparent
                        }
                    ) {
                        Text(
                            text = entry.dateLabel,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = if (isSelectedDate) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelectedDate) {
                                MaterialTheme.colorScheme.onPrimaryContainer
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            },
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            // Selected date biomarker values & overall progress delta
            val activeEntry = entries.getOrNull(selectedDateIndex) ?: entries.lastOrNull()
            val firstEntry = entries.firstOrNull()
            if (activeEntry != null && firstEntry != null) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Seçili Tarih Sonuçları (${activeEntry.dateLabel}) & İlk Ölçüme Göre Değişim",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    activeSpecs.forEach { spec ->
                        val currentVal = activeEntry.values[spec.key]
                        val startVal = firstEntry.values[spec.key]
                        if (currentVal != null) {
                            val delta = if (startVal != null) currentVal - startVal else 0f
                            val deltaSign = if (delta >= 0f) "+" else ""
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(10.dp)
                                            .clip(CircleShape)
                                            .background(Color(spec.colorHex))
                                    )
                                    Text(
                                        text = spec.label,
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                                Text(
                                    text = "$currentVal ${spec.unit} (${deltaSign}${"%.1f".format(Locale.US, delta)} ${spec.unit})",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}


