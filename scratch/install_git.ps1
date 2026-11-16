$ErrorActionPreference = 'Stop'
$url = 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/MinGit-2.47.1-64-bit.zip'
$dest = "C:\Users\Ashikul\AppData\Local\Programs\MinGit"
if (!(Test-Path $dest)) {
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
}
$zip = Join-Path $dest "mingit.zip"
Write-Host "Downloading MinGit..."
Invoke-WebRequest -Uri $url -OutFile $zip
Write-Host "Extracting MinGit..."
Expand-Archive -Path $zip -DestinationPath $dest -Force
Remove-Item $zip
Write-Host "MinGit ready at: $(Join-Path $dest 'cmd\git.exe')"
