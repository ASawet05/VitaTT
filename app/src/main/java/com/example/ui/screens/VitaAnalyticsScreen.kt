package com.example.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.LocalDrink
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.model.Supplement
import com.example.data.model.SupplementCategory
import com.example.data.model.VitalLog

@Composable
fun VitaAnalyticsScreen(
    userEmail: String?,
    userName: String?,
    supplements: List<Supplement>,
    vitalLogs: List<VitalLog>,
    waterGoalMl: Long,
    onUpdateWaterGoal: (Long) -> Unit,
    onResetDailyRoutine: () -> Unit,
    onSignOut: () -> Unit
) {
    val totalSupplements = supplements.size
    val takenSupplements = supplements.count { it.takenToday }
    val lowStockSupplements = supplements.filter { it.stockCount <= 5L }
    val totalWaterMl = vitalLogs.filter { it.type == "Su" }.sumOf { it.primaryValue }
    val totalHealthExpense = vitalLogs.filter { it.type == "Gider" }.sumOf { it.primaryValue }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("analytics_screen_list"),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "Analiz, Hedefler & Profil",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Rutin uyum istatistikleriniz, kategori dağılımı ve hesap ayarları",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        item {
            ClinicalSynthesisReportCard(
                supplements = supplements,
                bloodEntries = com.example.data.model.BloodTestTrendCatalog.defaultHistoricalSeries
            )
        }

        item {
            PwaNotificationSmartChecklistCard(
                supplements = supplements
            )
        }

        item {
            BloodTestMultiLineDashboardCard(
                entries = com.example.data.model.BloodTestTrendCatalog.defaultHistoricalSeries,
                biomarkers = com.example.data.model.BloodTestTrendCatalog.biomarkers
            )
        }

        // Category breakdown card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Kategori Bazlı Takviye & İlaç Dağılımı",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    SupplementCategory.entries.forEach { cat ->
                        val catItems = supplements.filter { it.category == cat.code }
                        val catTaken = catItems.count { it.takenToday }
                        val fraction = if (catItems.isNotEmpty()) {
                            catTaken.toFloat() / catItems.size.toFloat()
                        } else {
                            0f
                        }

                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = cat.displayLabel,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = "$catTaken / ${catItems.size} alındı",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            LinearProgressIndicator(
                                progress = { fraction },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(8.dp)
                                    .clip(RoundedCornerShape(50))
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Toplam Tamamlanan: $takenSupplements / $totalSupplements • Kritik Stok: ${lowStockSupplements.size} ürün • Sağlık Gideri: $totalHealthExpense ₺",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Water Goal adjustment card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.LocalDrink,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.tertiary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Günlük Su Hedefi Ayarı ($waterGoalMl ml)",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Bugün içilen toplam su: $totalWaterMl ml",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf(2000L, 2500L, 3000L, 3500L).forEach { target ->
                            val isSelected = waterGoalMl == target
                            if (isSelected) {
                                Button(
                                    onClick = { onUpdateWaterGoal(target) },
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("${target / 1000.0}L")
                                }
                            } else {
                                OutlinedButton(
                                    onClick = { onUpdateWaterGoal(target) },
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("${target / 1000.0}L")
                                }
                            }
                        }
                    }
                }
            }
        }

        // Account & Reset card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.AccountCircle,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = userName ?: "Vita Takip Pro Kullanıcısı",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = userEmail ?: "Google Hesabı ile Bağlı",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    FilledTonalButton(
                        onClick = onResetDailyRoutine,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("analytics_reset_daily_button")
                    ) {
                        Icon(imageVector = Icons.Default.Refresh, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(stringResource(R.string.reset_daily_routine))
                    }

                    Button(
                        onClick = onSignOut,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("sign_out_button"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error,
                            contentColor = MaterialTheme.colorScheme.onError
                        )
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Logout,
                            contentDescription = null
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(stringResource(R.string.sign_out))
                    }
                }
            }
        }
    }
}
