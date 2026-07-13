# ── Aturan R8 / ProGuard untuk aplikasi Capacitor ─────────────────────────────
# Capacitor & plugin dimuat lewat refleksi — WAJIB di-keep agar tidak dihapus /
# di-rename oleh R8 (kalau tidak, plugin gagal saat runtime).

# Simpan anotasi (dipakai Capacitor untuk menemukan plugin & method)
-keepattributes *Annotation*
-keepattributes JavascriptInterface

# ── Capacitor core ────────────────────────────────────────────────────────────
-keep public class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keepclassmembers class * {
  @com.getcapacitor.annotation.PermissionCallback <methods>;
  @com.getcapacitor.annotation.ActivityCallback <methods>;
  @com.getcapacitor.PluginMethod <methods>;
}

# ── Plugin pihak ketiga (biometrik) ──────────────────────────────────────────
-keep class com.aparajita.capacitor.biometricauth.** { *; }

# ── Cordova (di-bundle Capacitor) ────────────────────────────────────────────
-keep class org.apache.cordova.** { *; }

# ── WebView JavaScript interface ─────────────────────────────────────────────
-keepclassmembers class * {
  @android.webkit.JavascriptInterface <methods>;
}

# ── Umum: cegah warning yang menghentikan build ──────────────────────────────
-dontwarn com.getcapacitor.**
-dontwarn org.apache.cordova.**

# Simpan enum values() / valueOf() (dipakai refleksi)
-keepclassmembers enum * {
  public static **[] values();
  public static ** valueOf(java.lang.String);
}

# ── Kemas ulang kelas (repackaging) ──────────────────────────────────────────
# Pindahkan kelas non-keep ke package tanpa nama (top-level) → DEX lebih padat &
# skor obfuscation Play naik. Kelas Capacitor/plugin tetap aman karena di-keep.
-repackageclasses ''
