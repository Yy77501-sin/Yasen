$ErrorActionPreference = 'Continue'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outFile = Join-Path $root 'runtime\bot.out.log'
$errFile = Join-Path $root 'runtime\bot.err.log'
while ($true) {
  try {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -LiteralPath $outFile -Value "[$ts] starting node src/index.js"
    $p = Start-Process -FilePath 'node.exe' -ArgumentList 'src/index.js' -WorkingDirectory $root -RedirectStandardOutput $outFile -RedirectStandardError $errFile -PassThru
    Wait-Process -Id $p.Id
    $ts2 = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -LiteralPath $errFile -Value "[$ts2] node exited with code $($p.ExitCode); restarting in 3s"
  } catch {
    $ts3 = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -LiteralPath $errFile -Value "[$ts3] runner error: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 3
}
