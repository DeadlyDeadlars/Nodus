# NODUS ProGuard Rules - Security Hardened

# === REACT NATIVE ===
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.** { *; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }

# === WEBRTC ===
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**

# === CRYPTO - Keep NaCl/TweetNaCl ===
-keep class org.libsodium.** { *; }
-keepclassmembers class * {
    native <methods>;
}

# === OBFUSCATION - Aggressive ===
-repackageclasses 'n'
-allowaccessmodification
-overloadaggressively

# === ANTI-DEBUGGING ===
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
    public static *** e(...);
}

# === REMOVE DEBUG INFO ===
-renamesourcefileattribute ''
-keepattributes SourceFile,LineNumberTable

# === SECURITY - Hide sensitive class names ===
-keep,allowobfuscation class com.nodus.** { *; }

# === OKHTTP/NETWORKING ===
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# === GSON ===
-keep class com.google.gson.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# === MMKV Storage ===
-keep class com.tencent.mmkv.** { *; }

# === Notifee ===
-keep class io.invertase.notifee.** { *; }

# === Vision Camera ===
-keep class com.mrousavy.camera.** { *; }

# === Video ===
-keep class com.brentvatne.react.** { *; }

# === Prevent reflection attacks ===
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
