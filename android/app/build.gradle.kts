plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.winsmediatama.winsvoicestudio"
    compileSdk = 36

    defaultConfig {
        buildConfigField("String", "WINS_API_BASE_URL", "\""+providers.gradleProperty("WINS_API_BASE_URL").orElse("https://YOUR-WORKER.workers.dev/").get()+"\"")
        buildConfigField("String", "FIREBASE_API_KEY", "\""+providers.gradleProperty("FIREBASE_API_KEY").orElse("").get()+"\"")
        buildConfigField("String", "FIREBASE_APP_ID", "\""+providers.gradleProperty("FIREBASE_APP_ID").orElse("").get()+"\"")
        buildConfigField("String", "FIREBASE_PROJECT_ID", "\""+providers.gradleProperty("FIREBASE_PROJECT_ID").orElse("").get()+"\"")
        applicationId = "com.winsmediatama.winsvoicestudio"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.05.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.1")
    implementation("androidx.media3:media3-exoplayer:1.7.1")
    implementation("androidx.media3:media3-ui:1.7.1")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation(platform("com.google.firebase:firebase-bom:34.0.0"))
    implementation("com.google.firebase:firebase-auth")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.10.2")
}
