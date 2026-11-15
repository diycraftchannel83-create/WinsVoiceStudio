package com.winsmediatama.winsvoicestudio

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Ink = Color(0xFF080D16)
private val Panel = Color(0xFF111B2A)
private val Cyan = Color(0xFF35D9E8)
private val Mint = Color(0xFF79F2C0)
private val Muted = Color(0xFF91A2B8)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { WinsVoiceStudioApp() }
    }
}

@Composable
private fun WinsVoiceStudioApp() {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Cyan,
            secondary = Mint,
            background = Ink,
            surface = Panel,
            onPrimary = Ink,
            onBackground = Color.White,
            onSurface = Color.White
        )
    ) {
        Surface(modifier = Modifier.fillMaxSize(), color = Ink) {
            StudioScreen()
        }
    }
}

@Composable
private fun StudioScreen() {
    var script by remember { mutableStateOf("Halo! Temukan produk pilihan dengan kualitas terbaik. Pesan sekarang dan nikmati penawaran spesial hari ini!") }
    var language by remember { mutableStateOf("Bahasa Indonesia · id-ID") }
    var selectedStyle by remember { mutableIntStateOf(0) }
    var speed by remember { mutableFloatStateOf(1f) }
    var pitch by remember { mutableFloatStateOf(0f) }
    var notice by remember { mutableStateOf("") }
    var isGenerating by remember { mutableStateOf(false) }
    var creditBalance by remember { mutableIntStateOf(100) }
    var generatedAudio by remember { mutableStateOf<GenerateVoiceResponse?>(null) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val styles = listOf("Natural", "Energetic", "Professional", "Friendly", "Cinematic")
    val charCount = script.trim().length
    val estimatedCredits = ((charCount + 499) / 500) * 10

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Ink)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 22.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text("WINS MEDIATAMA", color = Cyan, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                Text("Voice Studio", color = Color.White, fontSize = 27.sp, fontWeight = FontWeight.Bold)
            }
            Card(
                colors = CardDefaults.cardColors(containerColor = Panel),
                shape = RoundedCornerShape(18.dp)
            ) {
                Column(Modifier.padding(horizontal = 14.dp, vertical = 9.dp)) {
                    Text("CREDIT", color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Text(creditBalance.toString(), color = Mint, fontSize = 19.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Ubah teks menjadi suara.", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text("Buat voice-over promosi yang terdengar profesional dalam hitungan detik.", color = Muted, fontSize = 13.sp)
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = Panel),
            shape = RoundedCornerShape(22.dp)
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("SCRIPT / NASKAH", color = Cyan, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Spacer(Modifier.weight(1f))
                    Text("$charCount karakter", color = Muted, fontSize = 11.sp)
                }
                OutlinedTextField(
                    value = script,
                    onValueChange = { script = it; notice = "" },
                    modifier = Modifier.fillMaxWidth().height(172.dp),
                    placeholder = { Text("Tulis naskah voice-over Anda...") },
                    shape = RoundedCornerShape(14.dp),
                    supportingText = { Text("Gunakan kalimat yang jelas agar hasil suara lebih natural.") }
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Bahasa & suara", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.weight(1f))
                    Text(language, color = Mint, fontSize = 12.sp)
                }
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("Indonesia", "English", "Arabic", "Malay").forEachIndexed { index, name ->
                        FilterChip(
                            selected = language.startsWith(name),
                            onClick = {
                                language = when (index) {
                                    0 -> "Bahasa Indonesia · id-ID"
                                    1 -> "English · en-US"
                                    2 -> "Arabic · ar-XA"
                                    else -> "Malay · ms-MY"
                                }
                            },
                            label = { Text(name) }
                        )
                    }
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("GAYA SUARA", color = Cyan, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                styles.forEachIndexed { index, style ->
                    FilterChip(
                        selected = selectedStyle == index,
                        onClick = { selectedStyle = index },
                        label = { Text(style) }
                    )
                }
            }
        }

        Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(22.dp)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Kecepatan bicara", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.weight(1f))
                    Text(String.format("%.1fx", speed), color = Mint, fontWeight = FontWeight.Bold)
                }
                Slider(value = speed, onValueChange = { speed = it }, valueRange = 0.75f..1.25f)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Pitch / Nada", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.weight(1f))
                    Text(String.format("%+.1f", pitch), color = Mint, fontWeight = FontWeight.Bold)
                }
                Slider(value = pitch, onValueChange = { pitch = it }, valueRange = -5f..5f)
            }
        }

        Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Estimasi penggunaan", color = Muted, fontSize = 12.sp)
                    Text("$estimatedCredits credit", color = Mint, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Text("10 credit / 500 karakter", color = Muted, fontSize = 10.sp)
                }
                Text("MP3", color = Cyan, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
            }
        }

        Button(
            onClick = {
                if (script.isBlank()) {
                    notice = "Masukkan naskah terlebih dahulu."
                } else if (!isGenerating) {
                    isGenerating = true
                    notice = "Menghubungkan ke WinsVoice API..."
                    scope.launch {
                        try {
                            val languageCode = when {
                                language.startsWith("English") -> "en-US"
                                language.startsWith("Arabic") -> "ar-XA"
                                language.startsWith("Malay") -> "ms-MY"
                                else -> "id-ID"
                            }
                            val voiceName = when (languageCode) {
                                "en-US" -> "en-US-Standard-C"
                                "ar-XA" -> "ar-XA-Standard-A"
                                "ms-MY" -> "ms-MY-Standard-A"
                                else -> "id-ID-Standard-A"
                            }
                            val result = WinsVoiceApi.generate(
                                context,
                                GenerateVoiceRequest(
                                    text = script.trim(),
                                    languageCode = languageCode,
                                    voiceName = voiceName,
                                    speakingRate = speed,
                                    pitch = pitch,
                                    preset = styles[selectedStyle].lowercase(),
                                    title = script.trim().take(64)
                                )
                            )
                            generatedAudio = result
                            creditBalance = result.credit_balance
                            notice = "Berhasil membuat audio MP3. ${result.credits_used} credit digunakan."
                        } catch (error: Exception) {
                            notice = error.message ?: "Gagal membuat audio. Periksa konfigurasi dan koneksi."
                        } finally {
                            isGenerating = false
                        }
                    }
                }
            },
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Cyan, contentColor = Ink)
        ) {
            Text(if (isGenerating) "GENERATING..." else "GENERATE VOICE  →", fontWeight = FontWeight.ExtraBold)
        }
        if (notice.isNotBlank()) {
            Text(notice, color = if (notice.startsWith("Gagal") || notice.startsWith("Firebase") || notice.startsWith("URL")) Color(0xFFFF8A80) else Mint, fontSize = 12.sp)
        }
        generatedAudio?.let { audio ->
            Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("AUDIO BERHASIL DIBUAT", color = Mint, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text(audio.title, color = Color.White, fontWeight = FontWeight.SemiBold)
                    Text("ID: ${audio.audio_id}", color = Muted, fontSize = 10.sp)
                    Text("MP3 · ${audio.audio_bytes} bytes", color = Cyan, fontSize = 12.sp)
                    Text("Audio tersimpan di cloud. Pemutar dan unduhan akan diaktifkan pada tahap berikutnya.", color = Muted, fontSize = 11.sp)
                }
            }
        }
        Text(
            "WinsVoiceStudio · AI Marketing Voice Studio",
            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
            color = Muted,
            fontSize = 10.sp
        )
    }
}
