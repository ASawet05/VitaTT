package com.example.ui.screens

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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.model.ClinicalInteractionEngine
import com.example.data.model.InteractionSeverity
import com.example.data.model.Supplement
import com.example.data.model.SupplementCategory
import com.example.data.model.TimeOfDaySlot
import com.example.ui.theme.VitaCoralHeart

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun VitaSupplementsScreen(
    supplements: List<Supplement>,
    onToggleSupplement: (Supplement) -> Unit,
    onRestockSupplement: (Supplement) -> Unit,
    onDeleteSupplement: (String) -> Unit,
    onOpenAddDialog: () -> Unit
) {
    var selectedTimeSlot by rememberSaveable { mutableStateOf("Tumu") }
    var searchQuery by rememberSaveable { mutableStateOf("") }

    val filtered = remember(supplements, selectedTimeSlot, searchQuery) {
        supplements.filter { item ->
            val matchesSlot = selectedTimeSlot == "Tumu" || item.timeOfDay == selectedTimeSlot
            val matchesSearch = searchQuery.isBlank() ||
                item.name.contains(searchQuery, ignoreCase = true) ||
                item.dosage.contains(searchQuery, ignoreCase = true) ||
                item.category.contains(searchQuery, ignoreCase = true)
            matchesSlot && matchesSearch
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("supplements_screen_list"),
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
                        text = "Vitamin, Takviye & İlaçlar",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Rutinlerinizi, doz saatlerini ve kalan kapsül stoklarını yönetin",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Button(
                    onClick = onOpenAddDialog,
                    modifier = Modifier.testTag("open_add_supplement_dialog_button")
                ) {
                    Icon(imageVector = Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Yeni Ekle")
                }
            }
        }

        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("supplement_search_input"),
                placeholder = { Text("Vitamin, mineral veya ilaç ara...") },
                leadingIcon = {
                    Icon(imageVector = Icons.Default.Search, contentDescription = "Ara")
                },
                singleLine = true,
                shape = RoundedCornerShape(16.dp)
            )
        }

        item {
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = selectedTimeSlot == "Tumu",
                    onClick = { selectedTimeSlot = "Tumu" },
                    label = { Text("Tümü (${supplements.size})") }
                )
                TimeOfDaySlot.entries.forEach { slot ->
                    val count = supplements.count { it.timeOfDay == slot.code }
                    FilterChip(
                        selected = selectedTimeSlot == slot.code,
                        onClick = { selectedTimeSlot = slot.code },
                        label = { Text("${slot.displayLabel} ($count)") }
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
                            imageVector = Icons.Default.Medication,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = stringResource(R.string.empty_supplements_title),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = stringResource(R.string.empty_supplements_desc),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            items(filtered, key = { it.id.ifEmpty { it.name + it.timeOfDay } }) { item ->
                SupplementDetailCard(
                    supplement = item,
                    onToggle = { onToggleSupplement(item) },
                    onRestock = { onRestockSupplement(item) },
                    onDelete = { if (item.id.isNotBlank()) onDeleteSupplement(item.id) }
                )
            }
        }
    }
}

@Composable
private fun SupplementDetailCard(
    supplement: Supplement,
    onToggle: () -> Unit,
    onRestock: () -> Unit,
    onDelete: () -> Unit
) {
    val category = SupplementCategory.fromCode(supplement.category)
    val slot = TimeOfDaySlot.fromCode(supplement.timeOfDay)
    val isLowStock = supplement.stockCount <= 5L

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onToggle) {
                    Icon(
                        imageVector = if (supplement.takenToday) {
                            Icons.Default.CheckCircle
                        } else {
                            Icons.Default.RadioButtonUnchecked
                        },
                        contentDescription = "Bugünkü Doz Durumu",
                        tint = if (supplement.takenToday) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                        modifier = Modifier.size(30.dp)
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = supplement.name,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${supplement.dosage} • ${category.displayLabel} • ${slot.displayLabel} (${slot.hourHint})",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.testTag("delete_supplement_${supplement.id}")
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Sil",
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }

            if (!supplement.notes.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Not: ${supplement.notes}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = if (isLowStock) {
                        VitaCoralHeart.copy(alpha = 0.16f)
                    } else {
                        MaterialTheme.colorScheme.surfaceVariant
                    },
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Inventory2,
                            contentDescription = null,
                            tint = if (isLowStock) VitaCoralHeart else MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Kalan Stok: ${supplement.stockCount} adet",
                            style = MaterialTheme.typography.labelLarge,
                            color = if (isLowStock) VitaCoralHeart else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = onRestock,
                        modifier = Modifier.testTag("restock_supplement_${supplement.id}")
                    ) {
                        Text("+30 Stok")
                    }
                    Button(onClick = onToggle) {
                        Text(if (supplement.takenToday) "Alındı ✓" else "Dozu Al")
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AddSupplementDialog(
    existingSupplements: List<Supplement> = emptyList(),
    onDismiss: () -> Unit,
    onConfirm: (
        name: String,
        dosage: String,
        category: String,
        timeOfDay: String,
        stockCount: Long,
        notes: String?
    ) -> Unit
) {
    var name by rememberSaveable { mutableStateOf("") }
    var dosage by rememberSaveable { mutableStateOf("1 Kapsül") }
    var selectedCategory by rememberSaveable { mutableStateOf(SupplementCategory.VITAMIN.code) }
    var selectedTime by rememberSaveable { mutableStateOf(TimeOfDaySlot.SABAH.code) }
    var stockText by rememberSaveable { mutableStateOf("30") }
    var notes by rememberSaveable { mutableStateOf("") }

    val liveAlerts = remember(existingSupplements, name, dosage, selectedCategory, selectedTime, notes) {
        if (name.isBlank()) {
            emptyList()
        } else {
            val candidate = Supplement(
                id = "candidate",
                name = name.trim(),
                dosage = dosage.trim(),
                category = selectedCategory,
                timeOfDay = selectedTime,
                notes = notes.takeIf { it.isNotBlank() }
            )
            ClinicalInteractionEngine.evaluateInteractions(existingSupplements, candidate)
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = stringResource(R.string.add_supplement),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Vitamin / İlaç Adı") },
                    placeholder = { Text("Örn: Vitamin D3 + K2") },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("supplement_name_input")
                )
                OutlinedTextField(
                    value = dosage,
                    onValueChange = { dosage = it },
                    label = { Text("Dozaj Bilgisi") },
                    placeholder = { Text("Örn: 1000 IU veya 500 mg") },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("supplement_dosage_input")
                )

                Text(
                    text = "Kategori",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold
                )
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SupplementCategory.entries.forEach { cat ->
                        FilterChip(
                            selected = selectedCategory == cat.code,
                            onClick = { selectedCategory = cat.code },
                            label = { Text(cat.displayLabel) }
                        )
                    }
                }

                Text(
                    text = "Kullanım Zamanı",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold
                )
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TimeOfDaySlot.entries.forEach { slot ->
                        FilterChip(
                            selected = selectedTime == slot.code,
                            onClick = { selectedTime = slot.code },
                            label = { Text(slot.displayLabel) }
                        )
                    }
                }

                OutlinedTextField(
                    value = stockText,
                    onValueChange = { stockText = it.filter { ch -> ch.isDigit() } },
                    label = { Text("Kutu / Kalan Stok Adedi") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("supplement_stock_input")
                )

                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Not (İsteğe Bağlı)") },
                    placeholder = { Text("Örn: Yemekten sonra tok karnına") },
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("supplement_notes_input")
                )

                if (liveAlerts.isNotEmpty()) {
                    val hasCritical = liveAlerts.any { it.severity == InteractionSeverity.CRITICAL }
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("dialog_live_interaction_warning"),
                        shape = RoundedCornerShape(14.dp),
                        color = if (hasCritical) {
                            MaterialTheme.colorScheme.errorContainer
                        } else {
                            MaterialTheme.colorScheme.tertiaryContainer
                        }
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = "Gerçek Zamanlı İlaç–Besin Etkileşim Uyarısı (${liveAlerts.size})",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = if (hasCritical) {
                                    MaterialTheme.colorScheme.onErrorContainer
                                } else {
                                    MaterialTheme.colorScheme.onTertiaryContainer
                                }
                            )
                            liveAlerts.forEach { alert ->
                                Text(
                                    text = "• ${alert.title}: ${alert.recommendation}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (hasCritical) {
                                        MaterialTheme.colorScheme.onErrorContainer
                                    } else {
                                        MaterialTheme.colorScheme.onTertiaryContainer
                                    }
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val stock = stockText.toLongOrNull() ?: 30L
                    onConfirm(
                        name,
                        dosage,
                        selectedCategory,
                        selectedTime,
                        stock,
                        notes.takeIf { it.isNotBlank() }
                    )
                },
                enabled = name.isNotBlank() && dosage.isNotBlank(),
                modifier = Modifier.testTag("confirm_add_supplement_button")
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
