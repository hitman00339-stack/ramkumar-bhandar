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

$xmlDir = "android\app\src\main\res\xml"
if (-not (Test-Path $xmlDir)) {
    New-Item -ItemType Directory -Force -Path $xmlDir | Out-Null
}
$xmlContent = '<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="my_images" path="." />
    <files-path name="my_files" path="." />
</paths>'
Set-Content -Path "$xmlDir\file_paths.xml" -Value $xmlContent -Encoding UTF8

Write-Host "Mipmap launcher icons and file_paths.xml configured successfully!"

