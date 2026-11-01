package com.example.data.model

data class ClinicalInteractionAlert(
    val id: String,
    val severity: InteractionSeverity,
    val title: String,
    val mechanism: String,
    val recommendation: String,
    val source: String
)

enum class InteractionSeverity(val badgeLabel: String) {
    CRITICAL("Kritik Etkileşim"),
    WARNING("Emilim / Zamanlama Uyarısı")
}

object ClinicalInteractionEngine {

    private data class DrugNutrientRule(
        val id: String,
        val drugLabel: String,
        val drugKeywords: List<String>,
        val nutrientKeywords: List<String>,
        val excludeKeywords: List<String> = emptyList(),
        val severity: InteractionSeverity,
        val mechanism: String,
        val recommendation: String,
        val source: String
    )

    private data class NutrientPairRule(
        val id: String,
        val title: String,
        val groupAKeywords: List<String>,
        val groupBKeywords: List<String>,
        val sameSlotOnly: Boolean = true,
        val severity: InteractionSeverity,
        val mechanism: String,
        val recommendation: String,
        val source: String
    )

    private val drugNutrientRules = listOf(
        DrugNutrientRule(
            id = "LEVO_CATIONS",
            drugLabel = "Levotiroksin (Tiroid İlacı)",
            drugKeywords = listOf("levotiroksin", "levothyroxine", "euthyrox", "levotiron", "tiroid", "tefor"),
            nutrientKeywords = listOf("demir", "iron", "kalsiyum", "calcium", "magnezyum", "magnesium", "çinko", "cinko", "zinc"),
            severity = InteractionSeverity.CRITICAL,
            mechanism = "Metal katyonları (Demir, Kalsiyum, Magnezyum, Çinko) bağırsakta levotiroksin ile çözünmeyen şelat oluşturarak tiroid hormonu emilimini %40–70 düşürür.",
            recommendation = "Tiroid ilacınız ile mineral takviyeleri arasında en az 4 saat ara bırakınız (Örn: İlaç Sabah, Mineral Öğle/Akşam).",
            source = "NIH ODS / ATA / Lexicomp"
        ),
        DrugNutrientRule(
            id = "WARFARIN_K2",
            drugLabel = "Kan Sulandırıcı (Coumadin / Varfarin / Aspirin)",
            drugKeywords = listOf("coumadin", "varfarin", "warfarin", "aspirin", "coraspin", "ecopirin", "plavix", "klopidogrel", "eliquis", "xarelto", "kan sulandırıcı"),
            nutrientKeywords = listOf("k2", "menakinon", "mk-7", "k vitamini"),
            excludeKeywords = listOf("k2'siz", "k2siz"),
            severity = InteractionSeverity.CRITICAL,
            mechanism = "K2 vitamini pıhtılaşma faktörlerini (VKORC1) aktive ederek kan sulandırıcı ilacın etkinliğini doğrudan baskılar ve pıhtılaşma riskini artırır.",
            recommendation = "Hekiminize danışarak K2 içermeyen Saf D3 formunu tercih ediniz.",
            source = "FDA / Lexicomp / TİTCK"
        ),
        DrugNutrientRule(
            id = "BLOOD_THINNER_OMEGA3",
            drugLabel = "Kan Sulandırıcı / Antiagregan",
            drugKeywords = listOf("coumadin", "varfarin", "warfarin", "aspirin", "coraspin", "ecopirin", "plavix", "klopidogrel", "eliquis", "xarelto", "kan sulandırıcı"),
            nutrientKeywords = listOf("omega", "balık yağı", "balik yagi", "epa", "dha", "krill"),
            severity = InteractionSeverity.WARNING,
            mechanism = "Yüksek doz Omega-3 trombosit agregasyonunu azaltarak kan sulandırıcı ilaçlarla birlikte kanama süresini uzatabilir.",
            recommendation = "Omega-3 dozunu hekim onayı olmadan artırmayınız ve kanama bulgularını izleyiniz.",
            source = "NIH ODS / EFSA"
        ),
        DrugNutrientRule(
            id = "PPI_IRON_B12",
            drugLabel = "Mide Koruyucu PPI (Omeprazol / Pantoprazol / Lansoprazol)",
            drugKeywords = listOf("omeprazol", "pantoprazol", "lansoprazol", "esomeprazol", "rabeprazol", "pantpas", "nexium", "lansor", "pulcet", "mide koruyucu", "ppi"),
            nutrientKeywords = listOf("demir", "iron", "b12", "kobalamin", "magnezyum", "kalsiyum"),
            excludeKeywords = listOf("lipozomal", "dilaltı", "dilalti", "sublingual", "sprey"),
            severity = InteractionSeverity.WARNING,
            mechanism = "Mide koruyucu (PPI) ilaçlar mide asidini ve İntrinsik Faktör salınımını baskılayarak standart tablet/kapsül Demir, B12, Kalsiyum ve Magnezyum emilimini düşürür.",
            recommendation = "Hekim önerisiyle mide asidinden bağımsız emilen Lipozomal Demir veya Dilaltı (Sublingual) B12 formlarını değerlendiriniz.",
            source = "Gastroenterology / NIH ODS"
        ),
        DrugNutrientRule(
            id = "METFORMIN_B12",
            drugLabel = "Metformin (Glucophage / Matofin / Diaformin)",
            drugKeywords = listOf("metformin", "glucophage", "matofin", "diaformin", "glifor"),
            nutrientKeywords = listOf("b12", "kobalamin", "folat", "folik"),
            severity = InteractionSeverity.WARNING,
            mechanism = "Metformin ileal kalsiyum bağımlı B12 emilimini azaltır; uzun süreli kullanımda B12 eksikliği ve nöropati riskini artırabilir.",
            recommendation = "Düzenli B12 takibi yaptırınız ve hekiminizle Dilaltı Metilkobalamin desteğini görüşünüz.",
            source = "ADA Diabetes Care"
        ),
        DrugNutrientRule(
            id = "ANTIBIOTIC_CATIONS",
            drugLabel = "Kinolon / Tetrasiklin Antibiyotik (Cipro / Monodoks vb.)",
            drugKeywords = listOf("siprofloksasin", "cipro", "levofloksasin", "tavanic", "moksifloksasin", "doksisiklin", "monodoks", "tetrasiklin", "antibiyotik"),
            nutrientKeywords = listOf("magnezyum", "magnesium", "demir", "iron", "kalsiyum", "calcium", "çinko", "cinko", "zinc"),
            severity = InteractionSeverity.CRITICAL,
            mechanism = "İki değerlikli mineraller (Mg, Fe, Ca, Zn) antibiyotik ile şelat oluşturarak antibiyotiğin emilimini %50–90 oranında bloke eder.",
            recommendation = "Mineral takviyesini antibiyotikten en az 2 saat önce veya 4–6 saat sonra alınız.",
            source = "FDA / Lexicomp"
        ),
        DrugNutrientRule(
            id = "BISPHOSPHONATE_CATIONS",
            drugLabel = "Bisfosfonat Kemik İlacı (Alendronat / Fosamax / Bonviva)",
            drugKeywords = listOf("alendronat", "fosamax", "risedronat", "actonel", "ibandronat", "bonviva", "bisfosfonat"),
            nutrientKeywords = listOf("kalsiyum", "calcium", "magnezyum", "magnesium", "demir", "iron"),
            severity = InteractionSeverity.CRITICAL,
            mechanism = "Kalsiyum, Magnezyum veya Demir bisfosfonat ilacına bağlanarak gastrointestinal emilimini tamamen sıfırlayabilir.",
            recommendation = "Bisfosfonat sabah aç karnına alındıktan sonra mineral takviyeleri için en az 2 saat bekleyiniz.",
            source = "Endocrine Society / Lexicomp"
        )
    )

    private val nutrientPairRules = listOf(
        NutrientPairRule(
            id = "PAIR_IRON_CALCIUM",
            title = "DMT1 Antagonizması: Demir & Kalsiyum Aynı Saat Diliminde",
            groupAKeywords = listOf("demir", "iron", "ferro"),
            groupBKeywords = listOf("kalsiyum", "calcium"),
            sameSlotOnly = true,
            severity = InteractionSeverity.CRITICAL,
            mechanism = "Demir ve Kalsiyum bağırsak DMT1 taşıyıcısı için rekabet eder; birlikte alındığında demir emilimi %60–80 azalır.",
            recommendation = "Demir ve Kalsiyumu farklı öğün dilimlerine (en az 3–4 saat ara ile) ayırınız.",
            source = "AJCN / NIH ODS"
        ),
        NutrientPairRule(
            id = "PAIR_IRON_ZINC",
            title = "Metal İyon Rekabeti: Demir & Çinko Aynı Saat Diliminde",
            groupAKeywords = listOf("demir", "iron", "ferro"),
            groupBKeywords = listOf("çinko", "cinko", "zinc"),
            sameSlotOnly = true,
            severity = InteractionSeverity.WARNING,
            mechanism = "Demir ve Çinko aynı öğünde alındığında bağırsak taşıyıcılarında kompetitif emilim kaybı oluşturur.",
            recommendation = "Demir ve Çinko takviyelerini günün farklı saat dilimlerine dağıtınız.",
            source = "NIH ODS"
        ),
        NutrientPairRule(
            id = "PAIR_IRON_MG",
            title = "Demir & Magnezyum Aynı Saat Diliminde",
            groupAKeywords = listOf("demir", "iron", "ferro"),
            groupBKeywords = listOf("magnezyum", "magnesium"),
            sameSlotOnly = true,
            severity = InteractionSeverity.WARNING,
            mechanism = "Magnezyum tuzları gastrik pH'ı yükselterek ve katyon rekabeti yaratarak demir emilimini azaltabilir.",
            recommendation = "Demiri Sabah/Öğle, Magnezyumu ise Akşam diliminde alınız.",
            source = "Clinical Pharmacokinetics"
        )
    )

    fun evaluateInteractions(
        supplements: List<Supplement>,
        candidate: Supplement? = null
    ): List<ClinicalInteractionAlert> {
        val allItems = if (candidate != null) supplements + candidate else supplements
        if (allItems.isEmpty()) return emptyList()

        val alerts = mutableListOf<ClinicalInteractionAlert>()
        val seenIds = mutableSetOf<String>()

        // 1. Check Drug-Nutrient rules
        drugNutrientRules.forEach { rule ->
            val matchingDrugs = allItems.filter { item ->
                val text = "${item.name} ${item.notes.orEmpty()} ${item.category}".lowercase()
                rule.drugKeywords.any { kw -> text.contains(kw) }
            }
            if (matchingDrugs.isNotEmpty()) {
                val matchingNutrients = allItems.filter { item ->
                    val text = "${item.name} ${item.dosage} ${item.notes.orEmpty()}".lowercase()
                    val hasNutrient = rule.nutrientKeywords.any { kw -> text.contains(kw) }
                    val isExcluded = rule.excludeKeywords.any { ex -> text.contains(ex) }
                    hasNutrient && !isExcluded && matchingDrugs.none { d -> d.name.equals(item.name, ignoreCase = true) }
                }

                matchingDrugs.forEach { drug ->
                    matchingNutrients.forEach { nutrient ->
                        val alertId = "${rule.id}_${drug.name}_${nutrient.name}"
                        if (seenIds.add(alertId)) {
                            val sameSlot = drug.timeOfDay.equals(nutrient.timeOfDay, ignoreCase = true)
                            val slotText = if (sameSlot) " (Her ikisi de ${drug.timeOfDay} diliminde!)" else ""
                            alerts.add(
                                ClinicalInteractionAlert(
                                    id = alertId,
                                    severity = rule.severity,
                                    title = "${rule.drugLabel} × ${nutrient.name}$slotText",
                                    mechanism = rule.mechanism,
                                    recommendation = rule.recommendation,
                                    source = rule.source
                                )
                            )
                        }
                    }
                }
            }
        }

        // 2. Check Supplement-Supplement pair rules
        nutrientPairRules.forEach { pairRule ->
            val groupA = allItems.filter { item ->
                val text = "${item.name} ${item.dosage}".lowercase()
                pairRule.groupAKeywords.any { kw -> text.contains(kw) }
            }
            val groupB = allItems.filter { item ->
                val text = "${item.name} ${item.dosage}".lowercase()
                pairRule.groupBKeywords.any { kw -> text.contains(kw) }
            }

            groupA.forEach { a ->
                groupB.forEach { b ->
                    if (!a.name.equals(b.name, ignoreCase = true)) {
                        val sameSlot = a.timeOfDay.equals(b.timeOfDay, ignoreCase = true)
                        if (!pairRule.sameSlotOnly || sameSlot) {
                            val sortedPair = listOf(a.name.lowercase(), b.name.lowercase()).sorted().joinToString("_")
                            val alertId = "${pairRule.id}_$sortedPair"
                            if (seenIds.add(alertId)) {
                                alerts.add(
                                    ClinicalInteractionAlert(
                                        id = alertId,
                                        severity = pairRule.severity,
                                        title = "${pairRule.title} (${a.timeOfDay})",
                                        mechanism = pairRule.mechanism,
                                        recommendation = pairRule.recommendation,
                                        source = pairRule.source
                                    )
                                )
                            }
                        }
                    }
                }
            }
        }

        return alerts
    }
}
