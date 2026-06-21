# Eciperay Android release (R8) rules.
# Consumer rules from dependencies (Expo, Reanimated, Worklets, etc.) are merged automatically.

# ---------- Application ----------

-keep class com.eciperay.MainApplication { *; }
-keep class com.eciperay.MainActivity { *; }

# ---------- React Native core ----------

-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
    void set*(***);
    *** get*();
}

-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.yoga.** { *; }

# New Architecture (Fabric / TurboModules)
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.react.defaults.** { *; }

-keep class * implements com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers,includedescriptorclasses class * {
    native <methods>;
}

-keep @com.facebook.react.module.annotations.ReactModule class * { *; }
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp *;
    @com.facebook.react.uimanager.annotations.ReactPropGroup *;
}

# Hermes JNI
-keep class com.facebook.hermes.unicode.** { *; }

# Fresco (image pipeline)
-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.drawee.** { *; }

# ---------- Kotlin / JNI metadata ----------

-keepattributes Signature
-keepattributes *Annotation*
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ---------- Expo (supplements bundled consumer rules) ----------

-keep class expo.modules.** { *; }

# ---------- Common React Native libraries ----------

-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.imagepicker.** { *; }
-keep class com.reactnativecommunity.asyncstorage.** { *; }
-keep class com.ReactNativeBlobUtil.** { *; }
-keep class com.christopherdro.RNPrint.** { *; }
-keep class com.corbt.keepawake.** { *; }
-keep class com.zoontek.rnlocalize.** { *; }
-keep class com.learnium.RNDeviceInfo.** { *; }

# ---------- PostHog Android SDK + RN bridge modules ----------

-keep class com.posthog.** { *; }
-keep class com.posthogreactnativeplugin.** { *; }
-keep class com.posthogreactnativesessionreplay.** { *; }
-dontwarn com.posthog.**

# ---------- Suppress benign warnings ----------

-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn okhttp3.**
-dontwarn okio.**
