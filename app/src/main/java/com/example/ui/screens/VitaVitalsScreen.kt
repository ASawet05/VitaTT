package com.example.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.MonitorHeart
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.model.VitalLog
import com.example.data.model.VitalType
import com.example.ui.theme.VitaGoldAccent
import com.example.ui.theme.VitaMintLight
import com.example.ui.theme.VitaSkyWater
import java.text.SimpleDateFormat
import java.util.Locale

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun VitaVitalsScreen(
    vitalLogs: List<VitalLog>,
    onDeleteVitalLog: (String) -> Unit,
    onOpenAddVitalDialog: () -> Unit
) {
    var selectedType by rememberSaveable { mutableStateOf("Tumu") }

    val filtered = remember(vitalLogs, selectedType) {
        if (selectedType == "Tumu") vitalLogs else vitalLogs.filter { it.type == selectedType }
    }

    val totalExpenseTl = remember(vitalLogs) {
        vitalLogs.filter { it.type == "Gider" }.sumOf { it.primaryValue }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("vitals_screen_list"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Vital Ölçüm & Gider Takibi",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Tansiyon, nabız, kan şekeri, kilo, uyku ve sağlık harcamaları",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Button(
                    onClick = onOpenAddVitalDialog,
                    modifier = Modifier.testTag("open_add_vital_dialog_button")
                ) {
                    Icon(imageVector = Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Kayıt Ekle")
                }
            }
        }

        if (filtered.isNotEmpty()) {
            item {
                VitalTrendChartCard(
                    logs = filtered.take(7).reversed(),
                    selectedType = selectedType,
                    totalExpenseTl = totalExpenseTl
                )
            }
        }

        item {
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = selectedType == "Tumu",
                    onClick = { selectedType = "Tumu" },
                    label = { Text("Tümü (${vitalLogs.size})") }
                )
                VitalType.entries.forEach { vType ->
                    val count = vitalLogs.count { it.type == vType.code }
                    FilterChip(
                        selected = selectedType == vType.code,
                        onClick = { selectedType = vType.code },
                        label = { Text("${vType.displayLabel} ($count)") }
                    )
                }
            }
        }

        if (filtered.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(22.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.MonitorHeart,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = stringResource(R.string.empty_vitals_title),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = stringResource(R.string.empty_vitals_desc),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            items(filtered, key = { it.id.ifEmpty { it.title + it.primaryValue } }) { log ->
                VitalLogDetailCard(
                    log = log,
                    onDelete = { if (log.id.isNotBlank()) onDeleteVitalLog(log.id) }
                )
            }
        }
    }
}

@Composable
private fun VitalTrendChartCard(
    logs: List<VitalLog>,
    selectedType: String,
    totalExpenseTl: Long
) {
    val barColor = when (selectedType) {
        "Su" -> VitaSkyWater
        "Gider" -> VitaGoldAccent
        else -> VitaMintLight
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Son Ölçüm Grafiği (${logs.size} Kayıt)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (totalExpenseTl > 0L) {
                            "Toplam Sağlık/Servis Gideri: $totalExpenseTl ₺"
                        } else {
                            "Son kayıtların karşılaştırmalı dağılımı"
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
            ) {
                if (logs.isEmpty()) return@Canvas
                val maxVal = logs.maxOf { it.primaryValue }.coerceAtLeast(1L).toFloat()
                val count = logs.size
                val slotWidth = size.width / count
                val barWidth = (slotWidth * 0.52f).coerceAtMost(42.dp.toPx())

                logs.forEachIndexed { index, item ->
                    val ratio = (item.primaryValue.toFloat() / maxVal).coerceIn(0.12f, 1f)
                    val barHeight = size.height * ratio
                    val x = index * slotWidth + (slotWidth - barWidth) / 2f
                    val y = size.height - barHeight
                    drawRoundRect(
                        color = barColor,
                        topLeft = Offset(x, y),
                        size = Size(barWidth, barHeight),
                        cornerRadius = CornerRadius(8.dp.toPx(), 8.dp.toPx())
                    )
                }
            }
        }
    }
}

@Composable
private fun VitalLogDetailCard(
    log: VitalLog,
    onDelete: () -> Unit
) {
    val dateFormat = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.forLanguageTag("tr-TR"))
    val dateText = log.createdAt?.toDate()?.let { dateFormat.format(it) } ?: "Yeni"
    val valueDisplay = if (log.type == "Tansiyon" && log.secondaryValue > 0L) {
        "${log.primaryValue}/${log.secondaryValue} ${log.unit}"
    } else {
        "${log.primaryValue} ${log.unit}"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = log.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${VitalType.fromCode(log.type).displayLabel} • $dateText",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (!log.note.isNullOrBlank()) {
                    Text(
                        text = log.note,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
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
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.testTag("delete_vital_${log.id}")
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Sil",
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AddVitalLogDialog(
    onDismiss: () -> Unit,
    onConfirm: (
        type: String,
        title: String,
        primaryValue: Long,
        secondaryValue: Long,
        unit: String,
        note: String?
    ) -> Unit
) {
    var selectedVitalType by rememberSaveable { mutableStateOf(VitalType.TANSIYON) }
    var title by rememberSaveable { mutableStateOf("Sabah Tansiyon Ölçümü") }
    var primaryText by rememberSaveable { mutableStateOf("120") }
    var secondaryText by rememberSaveable { mutableStateOf("80") }
    var note by rememberSaveable { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = stringResource(R.string.add_vital_log),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Ölçüm / Kayıt Türü",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold
                )
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    VitalType.entries.forEach { vType ->
                        FilterChip(
                            selected = selectedVitalType == vType,
                            onClick = {
                                selectedVitalType = vType
                                title = "${vType.displayLabel} Kaydı"
                                primaryText = when (vType) {
                                    VitalType.SU -> "250"
                                    VitalType.TANSIYON -> "120"
                                    VitalType.NABIZ -> "72"
                                    VitalType.SEKER -> "95"
                                    VitalType.KILO -> "74"
                                    VitalType.UYKU -> "8"
                                    VitalType.GIDER -> "450"
                                }
                                secondaryText = if (vType == VitalType.TANSIYON) "80" else "0"
                            },
                            label = { Text(vType.displayLabel) }
                        )
                    }
                }

                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Başlık / Açıklama") },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("vital_title_input")
                )

                OutlinedTextField(
                    value = primaryText,
                    onValueChange = { primaryText = it.filter { ch -> ch.isDigit() } },
                    label = { Text("${selectedVitalType.primaryHint} (${selectedVitalType.defaultUnit})") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("vital_primary_input")
                )

                if (selectedVitalType.secondaryHint != null) {
                    OutlinedTextField(
                        value = secondaryText,
                        onValueChange = { secondaryText = it.filter { ch -> ch.isDigit() } },
                        label = { Text("${selectedVitalType.secondaryHint} (${selectedVitalType.defaultUnit})") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("vital_secondary_input")
                    )
                }

                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("Not (İsteğe Bağlı)") },
                    placeholder = { Text("Örn: Dinlenme halinde ölçüldü") },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("vital_note_input")
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val pVal = primaryText.toLongOrNull() ?: 0L
                    val sVal = if (selectedVitalType.secondaryHint != null) {
                        secondaryText.toLongOrNull() ?: 0L
                    } else {
                        0L
                    }
                    onConfirm(
                        selectedVitalType.code,
                        title,
                        pVal,
                        sVal,
                        selectedVitalType.defaultUnit,
                        note.takeIf { it.isNotBlank() }
                    )
                },
                enabled = title.isNotBlank() && primaryText.isNotBlank(),
                modifier = Modifier.testTag("confirm_add_vital_button")
            ) {
                Text("Kaydet")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("İptal")
            }
        }
    )
}
