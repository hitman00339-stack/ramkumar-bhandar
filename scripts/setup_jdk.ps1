$ErrorActionPreference = "Stop"
$destBase = "C:\Users\HP\AppData\Local\Programs\jdk-21"
$zipPath = "C:\Users\HP\AppData\Local\Programs\temurin-21.zip"
$url = "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.13.1%2B2/OpenJDK21U-jdk_x64_windows_hotspot_21.0.13.1_2.zip"

if (-not (Test-Path $destBase)) {
    New-Item -ItemType Directory -Force -Path $destBase | Out-Null
}

Write-Host "Downloading OpenJDK 21 from GitHub Releases..."
curl.exe -L -o $zipPath $url

Write-Host "Extracting to $destBase..."
Expand-Archive -Path $zipPath -DestinationPath $destBase -Force

Remove-Item -Force $zipPath -ErrorAction SilentlyContinue
Write-Host "OpenJDK 21 setup complete!"

