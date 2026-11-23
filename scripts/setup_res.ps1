$densities = @('mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi')
$iconPath = "public\icons\icon-192.png"

foreach ($d in $densities) {
    $dir = "android\app\src\main\res\$d"
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    Copy-Item $iconPath "$dir\ic_launcher.png" -Force
    Copy-Item $iconPath "$dir\ic_launcher_round.png" -Force
}

Write-Host "Mipmap launcher icons copied successfully!"

