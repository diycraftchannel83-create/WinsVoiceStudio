package com.winsmediatama.winsvoicestudio

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.tasks.await
import androidx.media3.common.MediaItem
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import java.util.UUID
import java.util.concurrent.TimeUnit

data class GenerateVoiceRequest(
    val text: String,
    val languageCode: String,
    val voiceName: String,
    val speakingRate: Float,
    val pitch: Float,
    val preset: String,
    val title: String
)

data class GenerateVoiceResponse(
    val audio_id: String,
    val title: String,
    val language_code: String,
    val voice_name: String,
    val character_count: Int,
    val audio_bytes: Int,
    val credits_used: Int,
    val credit_balance: Int,
    val stream_path: String
)

private interface WinsVoiceService {
    @POST("v1/tts/generate")
    suspend fun generate(
        @Header("Authorization") authorization: String,
        @Header("Idempotency-Key") idempotencyKey: String,
        @Body request: GenerateVoiceRequest
    ): GenerateVoiceResponse
}

object WinsVoiceApi {
    private var service: WinsVoiceService? = null

    private fun firebaseAuth(context: Context): FirebaseAuth {
        val apiKey = BuildConfig.FIREBASE_API_KEY
        val appId = BuildConfig.FIREBASE_APP_ID
        val projectId = BuildConfig.FIREBASE_PROJECT_ID
        require(apiKey.isNotBlank() && appId.isNotBlank() && projectId.isNotBlank()) {
            "Firebase belum dikonfigurasi. Isi FIREBASE_API_KEY, FIREBASE_APP_ID, dan FIREBASE_PROJECT_ID."
        }

        val app = FirebaseApp.getApps(context).firstOrNull()
            ?: FirebaseApp.initializeApp(
                context,
                FirebaseOptions.Builder()
                    .setApiKey(apiKey)
                    .setApplicationId(appId)
                    .setProjectId(projectId)
                    .build()
            )
        return FirebaseAuth.getInstance(app)
    }

    private fun api(): WinsVoiceService {
        return service ?: run {
            val baseUrl = BuildConfig.WINS_API_BASE_URL
            require(baseUrl.startsWith("https://") && !baseUrl.contains("YOUR-WORKER")) {
                "URL Cloudflare Worker belum dikonfigurasi."
            }
            val client = OkHttpClient.Builder()
                .connectTimeout(20, TimeUnit.SECONDS)
                .readTimeout(90, TimeUnit.SECONDS)
                .build()
            Retrofit.Builder()
                .baseUrl(if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/")
                .client(client)
                .addConverterFactory(MoshiConverterFactory.create(Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()))
                .build()
                .create(WinsVoiceService::class.java)
                .also { service = it }
        }
    }

    private suspend fun idToken(context: Context): String {
        val auth = firebaseAuth(context)
        if (auth.currentUser == null) auth.signInAnonymously().await()
        return auth.currentUser?.getIdToken(false)?.await()?.token
            ?: error("Token Firebase tidak tersedia.")
    }

    suspend fun generate(context: Context, request: GenerateVoiceRequest): GenerateVoiceResponse {
        val token = idToken(context)
        return api().generate("Bearer $token", UUID.randomUUID().toString(), request)
    }

    suspend fun createPlayer(context: Context, streamPath: String): ExoPlayer {
        val token = idToken(context)
        val baseUrl = BuildConfig.WINS_API_BASE_URL.trimEnd('/')
        val dataSourceFactory = DefaultHttpDataSource.Factory()
            .setDefaultRequestProperties(mapOf("Authorization" to "Bearer $token"))
        val mediaSourceFactory = DefaultMediaSourceFactory(dataSourceFactory)
        return ExoPlayer.Builder(context)
            .setMediaSourceFactory(mediaSourceFactory)
            .build()
            .apply {
                setMediaItem(MediaItem.fromUri(baseUrl + streamPath))
                prepare()
            }
    }
}
