package com.example.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.Supplement
import com.example.data.model.VitalLog
import com.example.data.repository.VitaRepository
import com.google.firebase.Timestamp
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}

class VitaViewModel(
    private val repository: VitaRepository,
    private val currentUserId: String
) : ViewModel() {

    val supplementsState: StateFlow<UiState<List<Supplement>>> =
        repository.observeSupplements(currentUserId)
            .map<List<Supplement>, UiState<List<Supplement>>> { list ->
                val sorted = list.sortedByDescending { it.createdAt ?: Timestamp(0, 0) }
                UiState.Success(sorted)
            }
            .catch { error ->
                Log.w(TAG, "Error observing supplements", error)
                emit(UiState.Error(error.localizedMessage ?: "Takviyeler yüklenemedi"))
            }
            .stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(STOP_TIMEOUT_MILLIS),
                initialValue = UiState.Loading
            )

    val vitalLogsState: StateFlow<UiState<List<VitalLog>>> =
        repository.observeVitalLogs(currentUserId)
            .map<List<VitalLog>, UiState<List<VitalLog>>> { list ->
                val sorted = list.sortedByDescending { it.createdAt ?: Timestamp(0, 0) }
                UiState.Success(sorted)
            }
            .catch { error ->
                Log.w(TAG, "Error observing vital logs", error)
                emit(UiState.Error(error.localizedMessage ?: "Ölçümler yüklenemedi"))
            }
            .stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(STOP_TIMEOUT_MILLIS),
                initialValue = UiState.Loading
            )

    private val _waterGoalMl = MutableStateFlow(2500L)
    val waterGoalMl: StateFlow<Long> = _waterGoalMl.asStateFlow()

    private val _bannerMessage = MutableStateFlow<String?>(null)
    val bannerMessage: StateFlow<String?> = _bannerMessage.asStateFlow()

    fun clearBannerMessage() {
        _bannerMessage.value = null
    }

    fun updateWaterGoal(newGoalMl: Long) {
        _waterGoalMl.value = newGoalMl.coerceIn(1000L, 6000L)
        _bannerMessage.value = "Günlük su hedefi ${_waterGoalMl.value} ml olarak güncellendi."
    }

    fun addSupplement(
        name: String,
        dosage: String,
        category: String,
        timeOfDay: String,
        stockCount: Long,
        notes: String?
    ) {
        if (name.isBlank() || dosage.isBlank()) {
            _bannerMessage.value = "Lütfen takviye adı ve dozaj bilgisini girin."
            return
        }
        viewModelScope.launch {
            val result = repository.createSupplement(
                name = name,
                dosage = dosage,
                category = category,
                timeOfDay = timeOfDay,
                stockCount = stockCount,
                notes = notes
            )
            result.onSuccess {
                _bannerMessage.value = "$name rutininize eklendi."
            }.onFailure { err ->
                _bannerMessage.value = err.localizedMessage ?: "Takviye eklenemedi."
            }
        }
    }

    fun toggleSupplement(supplement: Supplement) {
        viewModelScope.launch {
            val result = repository.toggleSupplementTaken(supplement)
            result.onFailure { err ->
                _bannerMessage.value = err.localizedMessage ?: "Durum güncellenemedi."
            }
        }
    }

    fun restockSupplement(supplement: Supplement, addCount: Long = 30L) {
        viewModelScope.launch {
            val result = repository.restockSupplement(supplement, addCount)
            result.onSuccess {
                _bannerMessage.value = "${supplement.name} stoğuna +$addCount adet eklendi."
            }.onFailure { err ->
                _bannerMessage.value = err.localizedMessage ?: "Stok güncellenemedi."
            }
        }
    }

    fun resetDailyRoutine(supplements: List<Supplement>) {
        viewModelScope.launch {
            val result = repository.resetAllDailySupplements(supplements)
            result.onSuccess {
                _bannerMessage.value = "Yeni gün için tüm doz işaretleri sıfırlandı."
            }.onFailure { err ->
                _bannerMessage.value = err.localizedMessage ?: "Sıfırlama başarısız."
            }
        }
    }

    fun deleteSupplement(supplementId: String) {
        viewModelScope.launch {
            repository.deleteSupplement(supplementId).onFailure { err ->
                _bannerMessage.value = err.localizedMessage ?: "Silme işlemi başarısız."
            }
        }
    }

    fun quickAddWater(amountMl: Long) {
        viewModelScope.launch {
            val result = repository.createVitalLog(
                type = "Su",
                title = if (amountMl >= 500L) "Su Şişesi (${amountMl} ml)" else "Su Bardağı (${amountMl} ml)",
                primaryValue = amountMl,
                secondaryValue = 0L,
                unit = "ml",
                note = "Hızlı su kaydı"
            )
            result.onSuccess {
                _bannerMessage.value = "+$amountMl ml su eklendi!"
            }.onFailure { err ->
                _bannerMessage.value = err.localizedMessage ?: "Su kaydı eklenemedi."
            }
        }
    }

    fun addVitalLog(
        type: String,
        title: String,
        primaryValue: Long,
        secondaryValue: Long,
        unit: String,
        note: String?
    ) {
        if (title.isBlank()) {
            _bannerMessage.value = "Lütfen ölçüm başlığı girin."
            return
        }
        viewModelScope.launch {
            val result = repository.createVitalLog(
                type = type,
                title = title,
                primaryValue = primaryValue,
                secondaryValue = secondaryValue,
                unit = unit,
                note = note
            )
            result.onSuccess {
                _bannerMessage.value = "$title kaydedildi."
            }.onFailure { err ->
                _bannerMessage.value = err.localizedMessage ?: "Kayıt eklenemedi."
            }
        }
    }

    fun deleteVitalLog(logId: String) {
        viewModelScope.launch {
            repository.deleteVitalLog(logId).onFailure { err ->
                _bannerMessage.value = err.localizedMessage ?: "Kayıt silinemedi."
            }
        }
    }

    fun seedStarterRoutinePack() {
        viewModelScope.launch {
            repository.createSupplement(
                name = "Vitamin D3 + K2",
                dosage = "2000 IU / 1 Damla",
                category = "Vitamin",
                timeOfDay = "Sabah",
                stockCount = 45L,
                notes = "Kahvaltı ile birlikte"
            )
            repository.createSupplement(
                name = "Omega-3 Balık Yağı",
                dosage = "1000 mg",
                category = "Takviye",
                timeOfDay = "Ogle",
                stockCount = 30L,
                notes = "Öğle yemeğinden sonra tok karnına"
            )
            repository.createSupplement(
                name = "C Vitamini + Çinko",
                dosage = "500 mg",
                category = "Vitamin",
                timeOfDay = "Aksam",
                stockCount = 20L,
                notes = "Bağışıklık desteği"
            )
            repository.createSupplement(
                name = "Magnezyum Bisglisinat",
                dosage = "200 mg",
                category = "Mineral",
                timeOfDay = "Gece",
                stockCount = 60L,
                notes = "Uykudan 1 saat önce"
            )
            repository.createVitalLog(
                type = "Tansiyon",
                title = "Sabah Dinlenme Tansiyonu",
                primaryValue = 118L,
                secondaryValue = 76L,
                unit = "mmHg",
                note = "İdeal aralıkta"
            )
            repository.createVitalLog(
                type = "Nabiz",
                title = "Dinlenme Nabzı",
                primaryValue = 68L,
                secondaryValue = 0L,
                unit = "BPM",
                note = "Düzenli ritim"
            )
            repository.createVitalLog(
                type = "Su",
                title = "Sabah Suyu (500 ml)",
                primaryValue = 500L,
                secondaryValue = 0L,
                unit = "ml",
                note = "Güne başlangıç"
            )
            _bannerMessage.value = "Vita Takip Pro örnek rutin ve ölçüm paketi yüklendi!"
        }
    }

    private companion object {
        const val TAG = "VitaViewModel"
        const val STOP_TIMEOUT_MILLIS = 5000L
    }
}
