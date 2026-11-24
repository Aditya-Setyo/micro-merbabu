Write-Host "===== CEK AWAL SEBELUM TES ====="

# 1. Cek file JMX
if (Test-Path "jmeter\payva-test.jmx") { Write-Host "[OK] File JMX ada" } else { Write-Host "[GAGAL] File JMX tidak ketemu di jmeter\payva-test.jmx"; exit }

# 2. Cek CB harus CLOSED
try {
  $cb = Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/status" -TimeoutSec 5
  $cbJson = ($cb | ConvertTo-Json -Compress)
  if ($cbJson -like "*CLOSED*") { Write-Host "[OK] CB = CLOSED" } else { Write-Host "[GAGAL] CB masih $cbJson, reset dulu"; Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/reset" -Method POST | Out-Null; Write-Host "CB udah di-reset" }
} catch { Write-Host "[GAGAL] Service 8002 belum jalan"; exit }

# 3. Cek Fault harus DISABLE - BENERIN DI SINI
try {
  $fault = Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/status" -TimeoutSec 5
  $faultJson = ($fault | ConvertTo-Json -Compress)
  # API kamu pakai fault_injection = "none" kalau mati, "latency" / "error" kalau nyala
  $isMati = $false
  if ($fault.fault_injection -eq "none") { $isMati = $true }
  if ($fault.fault_injection -eq "" -or $null -eq $fault.fault_injection) { $isMati = $true }
  if ($fault.enabled -eq $false) { $isMati = $true }
  if ($fault.active -eq $false) { $isMati = $true }
  if ($fault.status -eq "disabled" -or $fault.status -eq "DISABLED" -or $fault.status -eq "DISABLE") { $isMati = $true }

  if ($isMati) {
    Write-Host "[OK] Fault = DISABLE (fault_injection = none)"
  } else {
    Write-Host "[GAGAL] Fault masih nyala: $faultJson, matiin dulu"
    Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/disable" -Method POST | Out-Null
    Write-Host "Fault udah dimatiin, jalanin status.ps1 lagi buat mastiin"
  }
} catch { Write-Host "[GAGAL] Service 8004 belum jalan"; exit }

Write-Host "===== CEK SELESAI ====="