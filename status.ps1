# status-FIXED.ps1 - Cek awal sebelum setiap sesi JMeter
Write-Host "===== CEK AWAL SEBELUM TES ====="
$mysqlUser = "root"
function Hitung-Mysql($q) { $h = mysql -u $mysqlUser -N -e $q; if ([string]::IsNullOrWhiteSpace($h)) { return 0 }; return [int]($h.ToString().Trim()) }

if (Test-Path "jmeter\payva-test.jmx") { Write-Host "[OK] File JMX ada" } else { Write-Host "[GAGAL] File JMX tidak ketemu di jmeter\payva-test.jmx"; exit }

# Cek 4 service
$services = @(
  @{ Url = "http://127.0.0.1:8001/api/hiking-routes"; Nama = "Booking 8001" },
  @{ Url = "http://127.0.0.1:8002/api/circuit/status"; Nama = "Payment 8002" },
  @{ Url = "http://127.0.0.1:8003/api/tracking/sos"; Nama = "Tracking 8003" },
  @{ Url = "http://127.0.0.1:8004/api/fault-inject/status"; Nama = "Gate 8004" }
)
foreach ($s in $services) {
  try { Invoke-RestMethod -Uri $s.Url -TimeoutSec 5 | Out-Null; Write-Host "[OK] $($s.Nama) jalan" } catch { Write-Host "[GAGAL] $($s.Nama) belum jalan: $($_.Exception.Message)"; exit }
}

# Cek Circuit harus CLOSED
try {
  $cb = Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/status" -TimeoutSec 5
  $cbJson = ($cb | ConvertTo-Json -Compress)
  if ($cbJson -like "*CLOSED*") { Write-Host "[OK] Circuit = CLOSED" } else { Write-Host "[GAGAL] Circuit masih $cbJson, reset dulu"; Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/reset" -Method POST | Out-Null; Write-Host "Circuit sudah di-reset, jalankan status.ps1 lagi" }
} catch { Write-Host "[GAGAL] Service 8002 belum jalan"; exit }

# Cek Fault harus none
try {
  $fault = Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/status" -TimeoutSec 5
  $faultJson = ($fault | ConvertTo-Json -Compress)
  $isMati = $false
  if ($fault.fault_injection -eq "none") { $isMati = $true }
  if ($fault.fault_injection -eq "" -or $null -eq $fault.fault_injection) { $isMati = $true }
  if ($fault.enabled -eq $false) { $isMati = $true }
  if ($fault.active -eq $false) { $isMati = $true }
  if ($fault.status -eq "disabled" -or $fault.status -eq "DISABLED") { $isMati = $true }
  if ($isMati) { Write-Host "[OK] Fault = DISABLE (fault_injection = none)" } else { Write-Host "[GAGAL] Fault masih nyala: $faultJson"; Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/disable" -Method POST | Out-Null; Write-Host "Fault sudah dimatikan, jalankan status.ps1 lagi" }
} catch { Write-Host "[GAGAL] Service 8004 belum jalan"; exit }

# Cek database harus bersih: 100 PENDING, 0 tiket untuk 141-240
$pending = Hitung-Mysql "USE payment_db; SELECT COUNT(*) FROM payments WHERE booking_id BETWEEN 141 AND 240 AND status='PENDING';"
$tiket = Hitung-Mysql "USE ticket_db; SELECT COUNT(*) FROM tickets WHERE booking_id BETWEEN 141 AND 240;"
Write-Host "Database: payments PENDING=$pending (harus 100), tickets=$tiket (harus 0)"
if ($pending -ne 100 -or $tiket -ne 0) { Write-Host "[GAGAL] Database belum bersih. Jalankan script pengujian yang akan reset otomatis, atau reset manual: UPDATE payments SET status='PENDING' WHERE booking_id BETWEEN 141 AND 240; DELETE FROM tickets WHERE booking_id BETWEEN 141 AND 240;"; exit }
Write-Host "[OK] Database bersih"
Write-Host "===== CEK SELESAI, BOLEH JALANKAN SESI BERIKUTNYA ====="
