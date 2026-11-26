$vu = 100
$mode = "proposed"
$ulang = 4
# ============================================================

$ErrorActionPreference = "Continue"
$jmeterExe = "D:\Skripsi\apache-jmeter-5.6.3\bin\jmeter.bat"
$jmxFile = "jmeter\payva-test.jmx"
$mysqlUser = "root"
$mysqlPass = ""
$jumlahPerSesi = 100
$loops = [int]($jumlahPerSesi / $vu)
$endpoint = if ($mode -eq "baseline") { "pay-va-baseline" } else { "pay-va" }
$nama = "Slow-${mode}-VU${vu}-Run${ulang}"
$skenarioNama = "Slow"
$faultType = "latency"

$waktu = Get-Date -Format "yyyyMMdd-HHmmss"
$tanggal = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$folderHasil = "jmeter\hasil\$nama-$waktu"
$namaFile = "$nama-$waktu"
New-Item -ItemType Directory -Path $folderHasil -Force | Out-Null
Write-Host "Folder hasil: $folderHasil"
Write-Host "Sesi: $nama - VU $vu x Loops $loops = $jumlahPerSesi request - Endpoint $endpoint - Fault $faultType NYALA"

function Jalankan-Mysql($q) {
  if ($mysqlPass -eq "") { mysql -u $mysqlUser -N -e $q } else { mysql -u $mysqlUser -p$mysqlPass -N -e $q }
}
function Hitung-Mysql($q) {
  $hasil = Jalankan-Mysql $q
  if ([string]::IsNullOrWhiteSpace($hasil)) { return 0 }
  return [int]($hasil.ToString().Trim())
}
function Verifikasi-CircuitClosed {
  for ($i=1; $i -le 3; $i++) {
    try {
      $cb = Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/status" -TimeoutSec 5
      $json = ($cb | ConvertTo-Json -Compress)
      if ($json -like "*CLOSED*") { Write-Host "[OK] Circuit = CLOSED"; return $true }
      Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/reset" -Method POST -TimeoutSec 5 | Out-Null
      Start-Sleep -Seconds 2
    } catch { Start-Sleep -Seconds 2 }
  }
  Write-Host "[GAGAL] Circuit tidak bisa kembali ke CLOSED" -ForegroundColor Red
  return $false
}
function Verifikasi-FaultMati {
  for ($i=1; $i -le 3; $i++) {
    try {
      $f = Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/status" -TimeoutSec 5
      if ($f.fault_injection -eq "none" -or $null -eq $f.fault_injection -or $f.fault_injection -eq "") {
        Write-Host "[OK] Fault = none"; return $true
      }
      Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/disable" -Method POST -TimeoutSec 5 | Out-Null
      Start-Sleep -Seconds 1
    } catch { Start-Sleep -Seconds 1 }
  }
  Write-Host "[GAGAL] Fault tidak bisa dimatikan" -ForegroundColor Red
  return $false
}
function Reset-Database {
  Write-Host "Reset database untuk booking_id 141 sampai 240..."
  Jalankan-Mysql "USE payment_db; UPDATE payments SET status='PENDING' WHERE booking_id BETWEEN 141 AND 240;"
  Jalankan-Mysql "USE ticket_db; DELETE FROM tickets WHERE booking_id BETWEEN 141 AND 240;"
  $pending = Hitung-Mysql "USE payment_db; SELECT COUNT(*) FROM payments WHERE booking_id BETWEEN 141 AND 240 AND status='PENDING';"
  $tiket = Hitung-Mysql "USE ticket_db; SELECT COUNT(*) FROM tickets WHERE booking_id BETWEEN 141 AND 240;"
  Write-Host "Setelah reset: payments PENDING=$pending, tickets=$tiket"
  if ($pending -ne 100 -or $tiket -ne 0) {
    Write-Host "[GAGAL] Reset database tidak bersih. Harusnya PENDING=100, tickets=0." -ForegroundColor Red
    return $false
  }
  Write-Host "[OK] Reset bersih"
  return $true
}
function Audit-Database {
  $suksesDB = Hitung-Mysql "USE payment_db; SELECT COUNT(*) FROM payments WHERE booking_id BETWEEN 141 AND 240 AND status='SUCCESS';"
  $tiketDB = Hitung-Mysql "USE ticket_db; SELECT COUNT(*) FROM tickets WHERE booking_id BETWEEN 141 AND 240 AND status='ACTIVE';"
  $tcr = [math]::Round(($tiketDB / 100 * 100), 1)
  Write-Host "Audit DB: payments SUCCESS=$suksesDB, tickets ACTIVE=$tiketDB, Ticket Confirmation Rate=$tcr persen"
  return @{ SuksesDB = $suksesDB; TiketDB = $tiketDB; TCR = $tcr }
}
function Enable-Fault {
  for ($i=1; $i -le 3; $i++) {
    try {
      $bodyJson = '{"type":"' + $faultType + '"}'
      Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/enable" -Method POST -Body $bodyJson -ContentType "application/json" -TimeoutSec 5 | Out-Null
      Start-Sleep -Seconds 1
      $f = Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/status" -TimeoutSec 5
      if ($f.fault_injection -eq $faultType) { Write-Host "[OK] Fault $faultType NYALA"; return $true }
    } catch { Start-Sleep -Seconds 1 }
  }
  Write-Host "[GAGAL] Fault $faultType tidak bisa dinyalakan" -ForegroundColor Red
  return $false
}
function Disable-Fault {
  for ($i=1; $i -le 3; $i++) {
    try { Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/disable" -Method POST -TimeoutSec 5 | Out-Null } catch {}
    try { Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/reset" -Method POST -TimeoutSec 5 | Out-Null } catch {}
    Start-Sleep -Seconds 1
    try {
      $f = Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/status" -TimeoutSec 5
      if ($f.fault_injection -eq "none") { Write-Host "[OK] Fault dimatikan, Circuit di-reset"; return }
    } catch {}
  }
  # Di Failure, Circuit bisa masih OPEN 30 detik. Tunggu sampai CLOSED, maksimal 35 detik.
  for ($w=1; $w -le 35; $w++) {
    try {
      $cb = Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/status" -TimeoutSec 5
      if (($cb | ConvertTo-Json -Compress) -like "*CLOSED*") { break }
    } catch {}
    Start-Sleep -Seconds 1
    if ($w -eq 35) {
      try { Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/reset" -Method POST -TimeoutSec 5 | Out-Null } catch {}
    }
  }
}

if (-not (Test-Path $jmeterExe)) { Write-Host "JMeter tidak ketemu"; exit }
if (-not (Test-Path $jmxFile)) { Write-Host "JMX tidak ketemu di $jmxFile"; exit }
try {
  Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/hiking-routes" -TimeoutSec 5 | Out-Null
  Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/status" -TimeoutSec 5 | Out-Null
  Invoke-RestMethod -Uri "http://127.0.0.1:8003/api/tracking/sos" -TimeoutSec 5 | Out-Null
  Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/status" -TimeoutSec 5 | Out-Null
  Write-Host "4 service jalan"
} catch { Write-Host "Service belum jalan, jalankan dulu 4 service"; exit }

if (-not (Reset-Database)) { exit }
if (-not (Verifikasi-CircuitClosed)) { exit }
if (-not (Verifikasi-FaultMati)) { exit }
Start-Sleep -Seconds 1

$csvPath = ((Get-Location).Path + "\" + $folderHasil + "\VA-" + $namaFile + ".csv") -replace '\\','/'
$sqlPath = "$folderHasil\VA-$namaFile.sql"
"USE payment_db; SELECT va_number FROM payments WHERE booking_id BETWEEN 141 AND 240 ORDER BY booking_id;" | Out-File -FilePath $sqlPath -Encoding utf8
mysql -u $mysqlUser -N -e "USE payment_db; SELECT va_number FROM payments WHERE booking_id BETWEEN 141 AND 240 ORDER BY booking_id;" | Out-File -FilePath $csvPath -Encoding ascii
$vasCek = @(Get-Content $csvPath | Where-Object { $_.Trim() -ne "" } | ForEach-Object { $_.Trim() })
Write-Host "VA: $csvPath ($($vasCek.Count) baris, pertama: $($vasCek[0]), terakhir: $($vasCek[-1]))"
if ($vasCek.Count -ne 100 -or $vasCek[0] -ne "8800000141" -or $vasCek[-1] -ne "8800000240") {
  Write-Host "[GAGAL] VA dari DB tidak benar. Harusnya 100 baris 8800000141 sampai 8800000240." -ForegroundColor Red
  exit
}

if (-not (Enable-Fault)) { exit }
Write-Host "===== Jalankan JMeter: $nama - VU $vu - Loops $loops - Endpoint $endpoint - Fault $faultType NYALA ====="
$jtl = "$folderHasil\DATA-$namaFile.jtl"
try {
  & $jmeterExe -n -t $jmxFile "-Jvu=$vu" "-Jloops=$loops" "-JvaFile=$csvPath" "-Jendpoint=$endpoint" -l $jtl -j "$folderHasil\LOG-$namaFile.log" | Out-Null
  Write-Host "JMeter selesai"
} finally {
  Disable-Fault
}
$audit = Audit-Database

if (Test-Path $jtl) {
  $data = Import-Csv -Path $jtl
  $elapsed = $data.elapsed | ForEach-Object { [int]$_ } | Sort-Object
  $sukses = ($data | Where-Object { $_.success -eq "true" }).Count
  $gagal = $data.Count - $sukses
  $rate = [math]::Round(($sukses / $data.Count * 100), 1)
  $avg = [math]::Round(($elapsed | Measure-Object -Average).Average, 1)
  $p95Index = [math]::Floor($elapsed.Count * 0.95)
  if ($p95Index -ge $elapsed.Count) { $p95Index = $elapsed.Count - 1 }
  $p95 = $elapsed[$p95Index]
  $p50 = $elapsed[[math]::Floor($elapsed.Count * 0.5)]
  $minStamp = ($data.timeStamp | ForEach-Object { [long]$_ } | Measure-Object -Minimum).Minimum
  $maxEnd = ($data | ForEach-Object { [long]$_.timeStamp + [long]$_.elapsed } | Measure-Object -Maximum).Maximum
  $durasi = [math]::Round((($maxEnd - $minStamp) / 1000), 1)
  if ($durasi -le 0) { $durasi = 1 }
  $throughput = [math]::Round($data.Count / $durasi, 2)
  Write-Host ""
  Write-Host "=========================================================="
  Write-Host "  HASIL $nama"
  Write-Host "=========================================================="
  Write-Host ("  Tanggal  : {0}" -f $tanggal)
  Write-Host ("  Endpoint : {0}  |  VU {1} x Loops {2}" -f $endpoint, $vu, $loops)
  Write-Host ("  Skenario : Slow - Fault {0} NYALA selama sesi" -f $faultType)
  Write-Host ("  Durasi   : {0} detik  |  Throughput: {1} req/detik" -f $durasi, $throughput)
  Write-Host "----------------------------------------------------------"
  Write-Host ("  HTTP Sukses: {0} / {1} = {2} persen" -f $sukses, $data.Count, $rate)
  Write-Host ("  DB payments SUCCESS: {0} | DB tickets ACTIVE: {1} | Ticket Confirmation Rate: {2} persen" -f $audit.SuksesDB, $audit.TiketDB, $audit.TCR)
  Write-Host ("  Min: {0} ms  |  P50: {1} ms  |  P95: {2} ms  |  Max: {3} ms" -f $elapsed[0], $p50, $p95, $elapsed[-1])
  Write-Host "=========================================================="
  $txtPath = "$folderHasil\RINGKASAN-$namaFile.txt"
  $isiTxt = @"
RINGKASAN HASIL PENGUJIAN
Sesi      : $nama
Tanggal   : $tanggal
Skenario  : Slow - Fault $faultType NYALA selama sesi
Mode      : $mode
Endpoint  : $endpoint
VU        : $vu
Loops     : $loops
Total     : $($data.Count) request
Durasi    : $durasi detik
Throughput: $throughput req/detik
HASIL JMeter (HTTP)
Total     : $($data.Count)
Sukses    : $sukses
Gagal     : $gagal
Rate      : $rate %
Avg       : $avg ms
Min       : $($elapsed[0]) ms
P50       : $p50 ms
P95       : $p95 ms
Max       : $($elapsed[-1]) ms
HASIL DATABASE (BUKTI)
Payments SUCCESS : $($audit.SuksesDB)
Tickets ACTIVE    : $($audit.TiketDB)
Ticket Confirmation Rate : $($audit.TCR) %
"@
  $isiTxt | Out-File -FilePath $txtPath -Encoding utf8
  $csvRingkasan = "$folderHasil\RINGKASAN-$namaFile.csv"
  $ringkasan = [PSCustomObject]@{
    Tanggal = $tanggal; Skenario = $skenarioNama; Fault = $faultType; Sesi = $nama; Mode = $mode; VU = $vu; Run = $ulang; Endpoint = $endpoint
    Total = $data.Count; Sukses = $sukses; Gagal = $gagal; Rate_Persen = $rate
    Avg_ms = $avg; Min_ms = $elapsed[0]; P50_ms = $p50; P95_ms = $p95; Max_ms = $elapsed[-1]
    Durasi_detik = $durasi; Throughput = $throughput
    Payment_Sukses_DB = $audit.SuksesDB; Tiket_Terbuat_DB = $audit.TiketDB; Ticket_Confirmation_Rate = $audit.TCR
  }
  $ringkasan | Export-Csv -Path $csvRingkasan -NoTypeInformation -Encoding UTF8
  $rekap = "jmeter\REKAP-SLOW-HASIL.csv"
  if (-not (Test-Path $rekap)) { $ringkasan | Export-Csv -Path $rekap -NoTypeInformation -Encoding UTF8 } else { $ringkasan | Export-Csv -Path $rekap -NoTypeInformation -Encoding UTF8 -Append }
  Write-Host "File: $txtPath, $csvRingkasan, $jtl, Rekap: $rekap"
} else {
  Write-Host "JTL tidak ketemu, JMeter gagal"
}
Write-Host ""
Write-Host "Jeda 1 menit"
for ($s=60; $s -gt 0; $s--) { Write-Host -NoNewline "`rSisa jeda: $s detik   "; Start-Sleep -Seconds 1 }
Write-Host ""
Write-Host "Jeda selesai, ganti vu, mode, ulang, jalankan status-FIXED.ps1, baru jalankan sesi berikutnya"
