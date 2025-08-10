Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    FACEBOOK CLONE BACKEND SERVER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting backend server..." -ForegroundColor Green
Write-Host ""

Set-Location $PSScriptRoot
node server.js

Read-Host "Press Enter to exit"
