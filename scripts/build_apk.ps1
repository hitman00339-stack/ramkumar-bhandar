$ErrorActionPreference = "Stop"

$javaHome = "C:\Users\HP\AppData\Local\Programs\jdk-21\jdk-21.0.13.1+2"
$androidHome = "C:\Users\HP\AppData\Local\Android\Sdk"
$gradleBat = "C:\Users\HP\.gradle\wrapper\dists\gradle-8.12-all\ejduaidbjup3bmmkhw3rie4zb\gradle-8.12\bin\gradle.bat"

$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;" + $env:Path
$env:ANDROID_HOME = $androidHome
$env:ANDROID_SDK_ROOT = $androidHome

Write-Host "Java Version:"
& "$javaHome\bin\java.exe" -version

Write-Host "Syncing Capacitor Web Assets..."
npx cap sync android

Write-Host "Ensuring Android Resources..."
& powershell -ExecutionPolicy Bypass -File scripts\setup_res.ps1

Write-Host "Building Android Debug APK via Gradle..."
& $gradleBat -p android assembleDebug

$sourceApk = "android\app\build\outputs\apk\debug\app-debug.apk"
$targetApk = "Ramkumar_Bhandar.apk"

if (Test-Path $sourceApk) {
    Copy-Item -Path $sourceApk -Destination $targetApk -Force
    $sizeMb = [math]::Round((Get-Item $targetApk).Length / 1MB, 2)
    Write-Host "SUCCESS: APK created successfully!"
    Write-Host "Location: $targetApk ($sizeMb MB)"
} else {
    Write-Error "Build finished but APK was not found at $sourceApk"
}

