$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
while ($true) {
  node src/index.js
  Start-Sleep -Seconds 2
}
