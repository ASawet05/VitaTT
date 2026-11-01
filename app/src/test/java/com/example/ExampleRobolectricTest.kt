package com.example

import android.content.Context
import android.view.ViewGroup
import android.webkit.WebView
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performScrollToNode
import androidx.test.core.app.ApplicationProvider
import com.example.ui.theme.MyApplicationTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class ExampleRobolectricTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `verify app name and vita web assets exist`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val appName = context.getString(R.string.app_name)
        assertEquals("Vita Takip Pro", appName)

        val indexHtml = context.assets.open("vita_web/index.html").bufferedReader().use { it.readText() }
        assertTrue(indexHtml.contains("VitaTakip"))
        assertTrue(indexHtml.contains("Bulut (Firebase) ile Giriş"))
        assertTrue(indexHtml.contains("Yerel (Cihaz) Depolama ile Giriş"))
        assertTrue(indexHtml.contains("id=\"btnFirebaseGoogleLogin\""))
        assertTrue(indexHtml.contains("startFirebaseGoogleLoginFromPortal()"))
        assertTrue(indexHtml.contains("id=\"authTabLoginBtn\""))
        assertTrue(indexHtml.contains("id=\"authTabRegisterBtn\""))
        assertTrue(indexHtml.contains("id=\"headerCloudSyncBtn\""))
        assertTrue(indexHtml.contains("id=\"headerCloudSyncPing\""))
        assertTrue(indexHtml.contains("id=\"headerCloudSyncIcon\""))
        assertTrue(indexHtml.contains("id=\"profileMenuCloudSyncDot\""))
        assertTrue(!indexHtml.contains("id=\"homeCompactDosageNotifRow\""))
        assertTrue(!indexHtml.contains("id=\"btnQuickPwaNotifTrigger\""))
        assertTrue(!indexHtml.contains("id=\"headerVitaSkor\""))
        assertTrue(!indexHtml.contains("Hesapsız / Şifresiz Hızlı Giriş"))
        assertTrue(!indexHtml.contains("quickGuestLogin"))

        val stateLabJs = context.assets.open("vita_web/js/app/06-state-lab-reference.js").bufferedReader().use { it.readText() }
        assertTrue(stateLabJs.contains("setHeaderCloudSyncVisualState"))
        assertTrue(stateLabJs.contains("triggerHeaderCloudSyncAnimation"))
        assertTrue(stateLabJs.contains("Eşitleniyor..."))
        assertTrue(stateLabJs.contains("Bulut Eşitlendi ✓"))

        val symptomImages = listOf(
            "tongue.jpg",
            "dark_nail.jpg",
            "spoon_nails.jpg",
            "brittle_nails.jpg",
            "mouth.jpg",
            "nails.jpg",
            "rash.jpg",
            "hair.jpg"
        )
        for (img in symptomImages) {
            val bytes = context.assets.open("vita_web/img/symptoms/$img").use { it.readBytes() }
            assertTrue("Symptom image $img should not be empty", bytes.isNotEmpty())
        }
    }

    @Test
    fun `verify VitaTakipWebPortalScreen renders full screen WebView`() {
        composeTestRule.setContent {
            MyApplicationTheme {
                VitaTakipWebPortalScreen(
                    currentUser = null,
                    onOpenCloudNativePanel = {}
                )
            }
        }

        composeTestRule.onNodeWithTag("vita_takip_webview").assertIsDisplayed()
        val semanticsNode = composeTestRule.onNodeWithTag("vita_takip_webview").fetchSemanticsNode()
        assertTrue("WebView height must be > 100px (full screen)", semanticsNode.boundsInRoot.height > 100f)
        assertTrue("WebView width must be > 100px (full screen)", semanticsNode.boundsInRoot.width > 100f)
    }

    @Test
    fun `verify real-time drug-nutrient interaction database and daily protocol alert`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val indexHtml = context.assets.open("vita_web/index.html").bufferedReader().use { it.readText() }
        assertTrue(indexHtml.contains("dailyProtocolMedicationsBar"))
        assertTrue(indexHtml.contains("dailyProtocolInteractionAlert"))
        assertTrue(indexHtml.contains("modalLiveInteractionWarning"))

        val conflictsJs = context.assets.open("vita_web/js/app/08-pdf-onboarding-conflicts.js").bufferedReader().use { it.readText() }
        assertTrue(conflictsJs.contains("VITA_CLINICAL_DRUG_NUTRIENT_DB"))
        assertTrue(conflictsJs.contains("evaluateClinicalDrugNutrientInteractions"))

        val items = listOf(
            com.example.data.model.Supplement(
                id = "1",
                name = "Euthyrox (Levotiroksin)",
                dosage = "100 mcg",
                category = "Ilac",
                timeOfDay = "Sabah"
            ),
            com.example.data.model.Supplement(
                id = "2",
                name = "Demir (Fe) Kapsül",
                dosage = "1 Kapsül",
                category = "Mineral",
                timeOfDay = "Sabah"
            )
        )
        val alerts = com.example.data.model.ClinicalInteractionEngine.evaluateInteractions(items)
        assertTrue("Expected Levothyroxine x Iron interaction alert", alerts.isNotEmpty())

        composeTestRule.setContent {
            MyApplicationTheme {
                com.example.ui.screens.VitaDashboardScreen(
                    supplements = items,
                    vitalLogs = emptyList(),
                    waterGoalMl = 2500L,
                    onQuickAddWater = {},
                    onToggleSupplement = {},
                    onOpenAddSupplement = {},
                    onOpenAddVital = {},
                    onSeedStarterPack = {},
                    onResetDailyRoutine = {}
                )
            }
        }

        val viewHomeIdx = indexHtml.indexOf("id=\"view-home\"")
        val greetingIdx = indexHtml.indexOf("id=\"homeGreetingTime\"")
        val reminderIdx = indexHtml.indexOf("openClinicalReminder()")
        val hydrationIdx = indexHtml.indexOf("id=\"homeHydrationText\"")
        val summaryDrawerIdx = indexHtml.indexOf("id=\"homeDailySummaryDetails\"")
        val supplementsIdx = indexHtml.indexOf("id=\"supplementChecklistContainer\"")
        val medShieldDrawerIdx = indexHtml.indexOf("id=\"dailyProtocolMedicationsDrawer\"")
        val pwaNotifDrawerIdx = indexHtml.indexOf("id=\"pwaNotificationSmartListDrawer\"")

        assertTrue("Greeting must be at the top of view-home", greetingIdx > viewHomeIdx)
        assertTrue("Clinical reminder must follow greeting", reminderIdx > greetingIdx)
        assertTrue("Daily hydration target must follow clinical reminder", hydrationIdx > reminderIdx)
        assertTrue("Daily summary indicators drawer must follow hydration", summaryDrawerIdx > hydrationIdx)
        assertTrue("Supplements & Pharmaceutical Forms must follow summary drawer", supplementsIdx > summaryDrawerIdx)
        assertTrue("Drug-Nutrient Shield drawer must follow supplements", medShieldDrawerIdx > supplementsIdx)
        assertTrue("PWA Notification Checklist drawer must follow Drug-Nutrient Shield", pwaNotifDrawerIdx > medShieldDrawerIdx)

        composeTestRule.onNodeWithTag("dashboard_list")
            .performScrollToNode(androidx.compose.ui.test.hasTestTag("daily_protocol_interaction_alert_card"))
        composeTestRule.onNodeWithTag("daily_protocol_interaction_alert_card").assertIsDisplayed()
    }

    @Test
    fun `verify Recharts multi-line historical blood test dashboard component`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val indexHtml = context.assets.open("vita_web/index.html").bufferedReader().use { it.readText() }
        assertTrue(indexHtml.contains("biomarkerChartCard"))
        assertTrue(indexHtml.contains("labsRechartsMultiLineMount"))
        assertTrue(indexHtml.contains("dailyProtocolMedicationsDrawer"))
        assertTrue(indexHtml.contains("js/recharts-lab-dashboard.js"))

        val rechartsJs = context.assets.open("vita_web/js/recharts-lab-dashboard.js").bufferedReader().use { it.readText() }
        assertTrue(rechartsJs.contains("RechartsEngine"))
        assertTrue(rechartsJs.contains("renderMultiLineChart"))
        assertTrue(rechartsJs.contains("VitaRechartsDashboard"))

        composeTestRule.setContent {
            MyApplicationTheme {
                com.example.ui.screens.VitaAnalyticsScreen(
                    userEmail = "test@vitatakip.com",
                    userName = "Test Kullanıcı",
                    supplements = emptyList(),
                    vitalLogs = emptyList(),
                    waterGoalMl = 2500L,
                    onUpdateWaterGoal = {},
                    onResetDailyRoutine = {},
                    onSignOut = {}
                )
            }
        }

        composeTestRule.onNodeWithTag("analytics_screen_list")
            .performScrollToNode(androidx.compose.ui.test.hasTestTag("clinical_synthesis_report_card"))
        composeTestRule.onNodeWithTag("clinical_synthesis_report_card").assertIsDisplayed()
        composeTestRule.onNodeWithTag("clinical_synthesis_summary_box").assertExists()

        composeTestRule.onNodeWithTag("analytics_screen_list")
            .performScrollToNode(androidx.compose.ui.test.hasTestTag("pwa_notification_smart_checklist_card"))
        composeTestRule.onNodeWithTag("pwa_notification_smart_checklist_card").assertIsDisplayed()
        composeTestRule.onNodeWithTag("pwa_notif_section_auto_browser_group").assertExists()
        composeTestRule.onNodeWithTag("pwa_notif_section_auto_sw_group").assertExists()

        composeTestRule.onNodeWithTag("analytics_screen_list")
            .performScrollToNode(androidx.compose.ui.test.hasTestTag("dashboard_blood_test_multiline_chart_card"))
        composeTestRule.onNodeWithTag("dashboard_blood_test_multiline_chart_card").assertIsDisplayed()
        composeTestRule.onNodeWithTag("dashboard_blood_test_multiline_canvas").assertIsDisplayed()

        assertTrue(indexHtml.contains("repProfessorSynthesisWrapper"))
        assertTrue(indexHtml.contains("repSynthesisNarrativeText"))
        assertTrue(indexHtml.contains("repSynthesisAlarmSection"))
        assertTrue(indexHtml.contains("pwaNotificationSmartListDrawer"))
        assertTrue(indexHtml.contains("pwaNotifSmartChecklistContainer"))
        assertTrue(indexHtml.contains("js/pwa-notification-checklist.js"))

        val reportJs = context.assets.open("vita_web/js/app/12-report-notifications-ai-chat.js").bufferedReader().use { it.readText() }
        assertTrue(reportJs.contains("buildProfessorClinicalSynthesisData"))
        assertTrue(reportJs.contains("renderProfessorClinicalSynthesis"))

        val pwaNotifJs = context.assets.open("vita_web/js/pwa-notification-checklist.js").bufferedReader().use { it.readText() }
        assertTrue(pwaNotifJs.contains("renderPwaNotificationSmartChecklist"))
        assertTrue(pwaNotifJs.contains("autoConfigureAllPwaNotifications"))
        assertTrue(pwaNotifJs.contains("detectBrowserProfile"))
        assertTrue(pwaNotifJs.contains("getServiceWorkerRegistrationProfile"))
        assertTrue(pwaNotifJs.contains("groupChecklistItems"))

        val conflictsJs = context.assets.open("vita_web/js/app/08-pdf-onboarding-conflicts.js").bufferedReader().use { it.readText() }
        assertTrue(conflictsJs.contains("VITA_KIDNEY_MEDICATION_SAFETY_RULES"))
        assertTrue(conflictsJs.contains("parseKidneyFunctionMarkersFromSource"))
        assertTrue(conflictsJs.contains("parseKidneyFunctionAndCompareMedications"))
        assertTrue(conflictsJs.contains("renderClinicalKidneySafetyWarningUI"))

        val navJs = context.assets.open("vita_web/js/app/02-navigation.js").bufferedReader().use { it.readText() }
        assertTrue(navJs.contains("view-settings"))
        assertTrue(navJs.contains("renderSettingsView"))
        assertTrue(navJs.contains("toggleHeaderProfileMenu"))

        assertTrue(indexHtml.contains("id=\"view-settings\""))
        assertTrue(indexHtml.contains("id=\"drawer-nav-view-settings\""))
        assertTrue(indexHtml.contains("id=\"headerProfileDropdownMenu\""))
        assertTrue(indexHtml.contains("id=\"drawerQuickNotifToggleBtn\""))
        assertTrue(!indexHtml.contains("id=\"homeCompactDosageNotifRow\""))
        assertTrue(indexHtml.contains("id=\"cdssKidneySafetyWarningContainer\""))

        // Verify duplicate old Chart.js canvas is removed from #view-labs while top Recharts mount remains
        assertTrue(indexHtml.contains("id=\"labsRechartsMultiLineMount\""))
        assertTrue(!indexHtml.contains("id=\"labTrendChart\""))

        // Verify simplified two-mode Doctor Report (Concise default vs Detailed optional)
        assertTrue(indexHtml.contains("id=\"btnReportModeConcise\""))
        assertTrue(indexHtml.contains("id=\"btnReportModeDetailed\""))
        assertTrue(indexHtml.contains("Kısa doktor raporu oluştur"))
        assertTrue(indexHtml.contains("Ayrıntılı klinik rapor oluştur"))
        assertTrue(indexHtml.contains("id=\"repConciseSymptomsSection\""))
        assertTrue(indexHtml.contains("id=\"repConciseMedSupplementSection\""))
        assertTrue(indexHtml.contains("id=\"repConciseClinicalPointsSection\""))
        assertTrue(indexHtml.contains("id=\"repConciseMissingInfoSection\""))
        assertTrue(reportJs.contains("setDoctorReportMode"))
        assertTrue(reportJs.contains("getDoctorReportMode"))

        // Verify Google Hesabı Bağla & Bulut Eşitleme button in #authModal, Header, Profile Menu Status Bar, Settings, and #cloudSyncModal
        assertTrue(indexHtml.contains("id=\"authGoogleCloudSyncBtn\""))
        assertTrue(indexHtml.contains("id=\"headerCloudSyncBtn\""))
        assertTrue(indexHtml.contains("id=\"profileMenuCloudStatusCard\""))
        assertTrue(indexHtml.contains("id=\"profileMenuCloudBarFill\""))
        assertTrue(indexHtml.contains("id=\"profileMenuCloudPill\""))
        assertTrue(indexHtml.contains("id=\"cloudSyncModal\""))
        assertTrue(indexHtml.contains("id=\"settingsCloudSyncStatusBadge\""))
        val stateJs = context.assets.open("vita_web/js/app/06-state-lab-reference.js").bufferedReader().use { it.readText() }
        assertTrue(stateJs.contains("openCloudSyncModal"))
        assertTrue(stateJs.contains("syncDataToCloudNow"))
        assertTrue(stateJs.contains("restoreDataFromCloudNow"))

        // Verify Task 1: Dual-mode Barcode & AI Recognition (Supplement vs Medication) & Turkish EAN-13 DB
        assertTrue(indexHtml.contains("id=\"btnHomeScanSupplementBarcode\""))
        assertTrue(indexHtml.contains("id=\"btnOpenMedicationScannerModal\""))
        assertTrue(indexHtml.contains("id=\"barcodeTrDatabaseQuickSelect\""))
        assertTrue(indexHtml.contains("id=\"barcodeMedicationInspectPanel\""))
        assertTrue(indexHtml.contains("id=\"barcodeCategoryFilterAlert\""))
        val barcodeJs = context.assets.open("vita_web/js/app/13-ai-summary-barcode.js").bufferedReader().use { it.readText() }
        assertTrue(barcodeJs.contains("VITA_TR_PRODUCT_BARCODE_DB"))
        assertTrue(barcodeJs.contains("switchBarcodeScannerMode"))
        assertTrue(barcodeJs.contains("transferScannedMedicationToInspector"))
        assertTrue(barcodeJs.contains("classifyScannedProductCategory"))

        // Verify Task 2: NeyimVar [Anamnez Triyaj ve eGFR Analiz] button, inline inputs, and inline result container
        assertTrue(indexHtml.contains("id=\"btnRunCDSS\""))
        assertTrue(indexHtml.contains("Anamnez Triyaj ve eGFR Analiz"))
        assertTrue(indexHtml.contains("id=\"neyimInputAge\""))
        assertTrue(indexHtml.contains("id=\"neyimInputGender\""))
        assertTrue(indexHtml.contains("id=\"neyimInputCreatinine\""))
        assertTrue(indexHtml.contains("id=\"neyimTriageEgfrResultContainer\""))
        assertTrue(indexHtml.contains("id=\"neyimTriageErrorBanner\""))
        val cdssJs = context.assets.open("vita_web/js/app/11-cdss-analysis.js").bufferedReader().use { it.readText() }
        assertTrue(cdssJs.contains("evaluateAnamnesisTriageAndEgfr"))
        assertTrue(cdssJs.contains("renderNeyimInlineTriageResult"))

        // Verify Task 3: Cloud Sync & Google Integration CSS z-index and overflow-wrap rules
        val styleCss = context.assets.open("vita_web/css/style.css").bufferedReader().use { it.readText() }
        assertTrue(styleCss.contains("vita-cloud-sync-modal"))
        assertTrue(styleCss.contains("overflow-wrap: anywhere"))
    }
}




