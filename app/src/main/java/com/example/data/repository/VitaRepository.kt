package com.example.data.repository

import android.content.Context
import com.example.R
import com.example.data.model.Supplement
import com.example.data.model.VitalLog
import com.google.firebase.Firebase
import com.google.firebase.auth.auth
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.snapshots
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await

class VitaRepository(private val db: FirebaseFirestore) {

    constructor(context: Context) : this(
        FirebaseFirestore.getInstance(
            context.applicationContext.getString(R.string.firestore_database_id)
        )
    )

    private val auth = Firebase.auth

    private fun requireUserId(): String {
        return auth.currentUser?.uid
            ?: throw IllegalStateException("Google hesabı ile giriş yapılmalıdır.")
    }

    fun observeSupplements(userId: String): Flow<List<Supplement>> {
        val path = "users/$userId/supplements"
        return db.collection("users").document(userId).collection("supplements")
            .whereEqualTo("userId", userId)
            .snapshots()
            .map { snapshot ->
                snapshot.toObjects(
                    Supplement::class.java,
                    DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                )
            }
            .catch { error ->
                if (error is Exception) {
                    handleFirestoreError(error, OperationType.LIST, path)
                }
                throw error
            }
    }

    fun observeVitalLogs(userId: String): Flow<List<VitalLog>> {
        val path = "users/$userId/vital_logs"
        return db.collection("users").document(userId).collection("vital_logs")
            .whereEqualTo("userId", userId)
            .snapshots()
            .map { snapshot ->
                snapshot.toObjects(
                    VitalLog::class.java,
                    DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                )
            }
            .catch { error ->
                if (error is Exception) {
                    handleFirestoreError(error, OperationType.LIST, path)
                }
                throw error
            }
    }

    suspend fun getSupplementById(ownerUserId: String, supplementId: String): Result<Supplement?> {
        val docRef = db.collection("users").document(ownerUserId)
            .collection("supplements").document(supplementId)
        return try {
            val snap = docRef.get().await()
            Result.success(
                snap.toObject(
                    Supplement::class.java,
                    DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                )
            )
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.GET, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun createSupplement(
        name: String,
        dosage: String,
        category: String,
        timeOfDay: String,
        stockCount: Long,
        notes: String? = null
    ): Result<String> {
        val uid = requireUserId()
        val colRef = db.collection("users").document(uid).collection("supplements")
        val docRef = colRef.document()
        val payload = mutableMapOf<String, Any>(
            "userId" to uid,
            "name" to name.trim().take(80),
            "dosage" to dosage.trim().take(40),
            "category" to category,
            "timeOfDay" to timeOfDay,
            "takenToday" to false,
            "stockCount" to stockCount.coerceIn(0L, 10000L),
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        val cleanNotes = notes?.trim()?.take(200)
        if (!cleanNotes.isNullOrEmpty()) {
            payload["notes"] = cleanNotes
        }
        return try {
            docRef.set(payload).await()
            Result.success(docRef.id)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun toggleSupplementTaken(supplement: Supplement): Result<Unit> {
        val uid = requireUserId()
        require(supplement.id.isNotBlank()) { "Supplement ID boş olamaz" }
        val docRef = db.collection("users").document(uid)
            .collection("supplements").document(supplement.id)
        val newTaken = !supplement.takenToday
        val newStock = if (newTaken && supplement.stockCount > 0L) {
            supplement.stockCount - 1L
        } else if (!newTaken && supplement.stockCount < 10000L) {
            supplement.stockCount + 1L
        } else {
            supplement.stockCount
        }
        return try {
            docRef.update(
                mapOf(
                    "takenToday" to newTaken,
                    "stockCount" to newStock,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun restockSupplement(supplement: Supplement, addAmount: Long): Result<Unit> {
        val uid = requireUserId()
        require(supplement.id.isNotBlank()) { "Supplement ID boş olamaz" }
        val docRef = db.collection("users").document(uid)
            .collection("supplements").document(supplement.id)
        val updatedStock = (supplement.stockCount + addAmount).coerceIn(0L, 10000L)
        return try {
            docRef.update(
                mapOf(
                    "stockCount" to updatedStock,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun resetAllDailySupplements(supplements: List<Supplement>): Result<Unit> {
        val uid = requireUserId()
        return try {
            for (item in supplements) {
                if (item.takenToday && item.id.isNotBlank()) {
                    val docRef = db.collection("users").document(uid)
                        .collection("supplements").document(item.id)
                    docRef.update(
                        mapOf(
                            "takenToday" to false,
                            "updatedAt" to FieldValue.serverTimestamp()
                        )
                    ).await()
                }
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, "users/$uid/supplements")
            Result.failure(e)
        }
    }

    suspend fun deleteSupplement(supplementId: String): Result<Unit> {
        val uid = requireUserId()
        val docRef = db.collection("users").document(uid)
            .collection("supplements").document(supplementId)
        return try {
            docRef.delete().await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.DELETE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun createVitalLog(
        type: String,
        title: String,
        primaryValue: Long,
        secondaryValue: Long = 0L,
        unit: String,
        note: String? = null
    ): Result<String> {
        val uid = requireUserId()
        val colRef = db.collection("users").document(uid).collection("vital_logs")
        val docRef = colRef.document()
        val payload = mutableMapOf<String, Any>(
            "userId" to uid,
            "type" to type,
            "title" to title.trim().take(80),
            "primaryValue" to primaryValue.coerceIn(0L, 100000L),
            "secondaryValue" to secondaryValue.coerceIn(0L, 100000L),
            "unit" to unit.trim().take(20),
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        val cleanNote = note?.trim()?.take(200)
        if (!cleanNote.isNullOrEmpty()) {
            payload["note"] = cleanNote
        }
        return try {
            docRef.set(payload).await()
            Result.success(docRef.id)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun deleteVitalLog(logId: String): Result<Unit> {
        val uid = requireUserId()
        val docRef = db.collection("users").document(uid)
            .collection("vital_logs").document(logId)
        return try {
            docRef.delete().await()
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.DELETE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun savePortalState(
        displayName: String,
        email: String,
        payloadJson: String
    ): Result<Unit> {
        val uid = requireUserId()
        val safeName = displayName.trim().ifEmpty { "Kullanıcı" }.take(100)
        val safeEmail = email.trim().ifEmpty { "user@vitatakip.local" }.take(120)
        val safePayload = payloadJson.trim().ifEmpty { "{}" }.take(250000)
        val docRef = db.collection("users").document(uid)
            .collection("portal_state").document("main")
        return try {
            val existingSnap = docRef.get().await()
            if (existingSnap.exists()) {
                docRef.update(
                    mapOf(
                        "displayName" to safeName,
                        "email" to safeEmail,
                        "payloadJson" to safePayload,
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            } else {
                docRef.set(
                    mapOf(
                        "userId" to uid,
                        "displayName" to safeName,
                        "email" to safeEmail,
                        "payloadJson" to safePayload,
                        "createdAt" to FieldValue.serverTimestamp(),
                        "updatedAt" to FieldValue.serverTimestamp()
                    )
                ).await()
            }
            Result.success(Unit)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, docRef.path)
            Result.failure(e)
        }
    }

    suspend fun loadPortalState(ownerUserId: String = requireUserId()): Result<String?> {
        val docRef = db.collection("users").document(ownerUserId)
            .collection("portal_state").document("main")
        return try {
            val snap = docRef.get().await()
            if (snap.exists()) {
                Result.success(snap.getString("payloadJson"))
            } else {
                Result.success(null)
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.GET, docRef.path)
            Result.failure(e)
        }
    }
}

