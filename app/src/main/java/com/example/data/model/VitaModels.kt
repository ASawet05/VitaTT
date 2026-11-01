package com.example.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.ServerTimestamp

@IgnoreExtraProperties
data class Supplement(
    @DocumentId val id: String = "",
    val userId: String = "",
    val name: String = "",
    val dosage: String = "",
    val category: String = "Vitamin", // Vitamin, Mineral, Ilac, Takviye
    val timeOfDay: String = "Sabah", // Sabah, Ogle, Aksam, Gece
    val takenToday: Boolean = false,
    val stockCount: Long = 30L,
    val notes: String? = null,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@IgnoreExtraProperties
data class VitalLog(
    @DocumentId val id: String = "",
    val userId: String = "",
    val type: String = "Su", // Su, Tansiyon, Nabiz, Kilo, Seker, Uyku, Gider
    val title: String = "",
    val primaryValue: Long = 0L,
    val secondaryValue: Long = 0L,
    val unit: String = "ml",
    val note: String? = null,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

enum class SupplementCategory(val code: String, val displayLabel: String) {
    VITAMIN("Vitamin", "Vitamin"),
    MINERAL("Mineral", "Mineral"),
    ILAC("Ilac", "İlaç"),
    TAKVIYE("Takviye", "Takviye");

    companion object {
        fun fromCode(code: String): SupplementCategory =
            entries.firstOrNull { it.code == code } ?: VITAMIN
    }
}

enum class TimeOfDaySlot(val code: String, val displayLabel: String, val hourHint: String) {
    SABAH("Sabah", "Sabah", "08:00 - 11:00"),
    OGLE("Ogle", "Öğle", "12:00 - 15:00"),
    AKSAM("Aksam", "Akşam", "18:00 - 21:00"),
    GECE("Gece", "Gece", "22:00 - 23:59");

    companion object {
        fun fromCode(code: String): TimeOfDaySlot =
            entries.firstOrNull { it.code == code } ?: SABAH
    }
}

enum class VitalType(
    val code: String,
    val displayLabel: String,
    val defaultUnit: String,
    val primaryHint: String,
    val secondaryHint: String? = null
) {
    SU("Su", "Su Tüketimi", "ml", "Miktar (ml)"),
    TANSIYON("Tansiyon", "Tansiyon", "mmHg", "Büyük (Sistolik)", "Küçük (Diyastolik)"),
    NABIZ("Nabiz", "Nabız", "BPM", "Atım / Dakika (BPM)"),
    SEKER("Seker", "Kan Şekeri", "mg/dL", "Glikoz (mg/dL)"),
    KILO("Kilo", "Kilo Takibi", "kg", "Ağırlık (kg)"),
    UYKU("Uyku", "Uyku Süresi", "saat", "Süre (saat)"),
    GIDER("Gider", "Sağlık / Servis Gideri", "TL", "Tutar (₺)");

    companion object {
        fun fromCode(code: String): VitalType =
            entries.firstOrNull { it.code == code } ?: SU
    }
}

data class BloodTestBiomarkerSpec(
    val key: String,
    val label: String,
    val unit: String,
    val refMin: Float,
    val refMax: Float,
    val colorHex: Long
)

data class BloodTestHistoryEntry(
    val dateLabel: String,
    val values: Map<String, Float>
) {
    fun normalizedPercent(spec: BloodTestBiomarkerSpec): Float? {
        val raw = values[spec.key] ?: return null
        val span = (spec.refMax - spec.refMin).coerceAtLeast(0.001f)
        return (((raw - spec.refMin) / span) * 100f).coerceIn(-20f, 130f)
    }
}

object BloodTestTrendCatalog {
    val biomarkers: List<BloodTestBiomarkerSpec> = listOf(
        BloodTestBiomarkerSpec("d3", "D3 Vitamini", "ng/mL", 30f, 80f, 0xFF0D9488),
        BloodTestBiomarkerSpec("b12", "B12 Vitamini", "pg/mL", 250f, 900f, 0xFF4F46E5),
        BloodTestBiomarkerSpec("ferritin", "Ferritin", "ng/mL", 30f, 150f, 0xFFE11D48),
        BloodTestBiomarkerSpec("hb", "Hemoglobin", "g/dL", 12.0f, 16.5f, 0xFFDC2626),
        BloodTestBiomarkerSpec("mg", "Magnezyum", "mg/dL", 1.8f, 2.3f, 0xFFD97706),
        BloodTestBiomarkerSpec("folate", "Folat (B9)", "ng/mL", 4.0f, 20.0f, 0xFF059669)
    )

    val defaultHistoricalSeries: List<BloodTestHistoryEntry> = listOf(
        BloodTestHistoryEntry(
            dateLabel = "14.05.2026",
            values = mapOf("d3" to 14.2f, "b12" to 185f, "ferritin" to 12.4f, "hb" to 11.6f, "mg" to 1.65f, "folate" to 4.8f)
        ),
        BloodTestHistoryEntry(
            dateLabel = "10.07.2026",
            values = mapOf("d3" to 24.8f, "b12" to 295f, "ferritin" to 24.0f, "hb" to 12.4f, "mg" to 1.82f, "folate" to 7.5f)
        ),
        BloodTestHistoryEntry(
            dateLabel = "05.09.2026",
            values = mapOf("d3" to 33.5f, "b12" to 410f, "ferritin" to 38.5f, "hb" to 13.1f, "mg" to 1.96f, "folate" to 10.2f)
        ),
        BloodTestHistoryEntry(
            dateLabel = "22.10.2026",
            values = mapOf("d3" to 41.2f, "b12" to 525f, "ferritin" to 52.0f, "hb" to 13.8f, "mg" to 2.08f, "folate" to 12.6f)
        )
    )
}

