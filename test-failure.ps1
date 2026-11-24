$vu = 100 # <-- GANTI: 10 / 25 / 50 / 100
$mode = "proposed"    # <-- GANTI: "baseline" atau "proposed"
$ulang = 4 # <-- GANTI: 1 / 2 / 3
# ============================================================
# 1 SESI FAILURE - Fault error NYALA selama sesi, habis itu dimatiin

$ErrorActionPreference = "Continue"
$jmeterExe = "D:\Skripsi\apache-jmeter-5.6.3\bin\jmeter.bat"
$jmxFile = "jmeter\payva-test.jmx"
$mysqlUser = "root"
$mysqlPass = ""
$jumlahPerSesi = 100
$loops = [int]($jumlahPerSesi / $vu)
$endpoint = if ($mode -eq "baseline") { "pay-va-baseline" } else { "pay-va" }
$nama = "Failure-${mode}-VU${vu}-Run${ulang}"
$skenario = "Failure"
$faultType = "error"

$waktu = Get-Date -Format "yyyyMMdd-HHmmss"
$tanggal = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$folderHasil = "jmeter\hasil\$nama-$waktu"
$namaFile = "$nama-$waktu"
New-Item -ItemType Directory -Path $folderHasil -Force | Out-Null
Write-Host "Folder hasil: $folderHasil"
Write-Host "Sesi: $nama - VU $vu x Loops $loops = $jumlahPerSesi request - Endpoint $endpoint - Fault: $faultType NYALA"

function Jalankan-Mysql($q) {
  if ($mysqlPass -eq "") { mysql -u $mysqlUser -e $q } else { mysql -u $mysqlUser -p$mysqlPass -e $q }
}

function Enable-Fault {
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/enable" -Method POST -Body '{"type":"error"}' -ContentType "application/json" | Out-Null
    Start-Sleep -Seconds 2
    Write-Host "Fault error NYALA"
    return $true
  } catch {
    Write-Host "GAGAL nyalain fault: $_"
    return $false
  }
}

function Disable-Fault {
  try { Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/disable" -Method POST | Out-Null } catch {}
  try { Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/reset" -Method POST | Out-Null } catch {}
  # Di Failure, CB bisa masih OPEN habis banyak gagal, kasih jeda biar balik CLOSED
  Start-Sleep -Seconds 2
  Write-Host "Fault DIMATIIN + CB di-reset"
}

# 1. Cek file
if (-not (Test-Path $jmeterExe)) { Write-Host "JMeter tidak ketemu"; exit }
if (-not (Test-Path $jmxFile)) { Write-Host "JMX tidak ketemu di $jmxFile"; exit }

# 2. Cek service
try {
  Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/status" -TimeoutSec 5 | Out-Null
  Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/status" -TimeoutSec 5 | Out-Null
  Write-Host "Service jalan"
} catch { Write-Host "Service belum jalan, jalanin dulu 4 service"; exit }

# 3. Reset
Write-Host "Reset..."
Jalankan-Mysql "USE ticket_db; DELETE FROM tickets WHERE booking_id IN (4,5,6,7,8,9,10,11,12,13);"
try { Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/reset" -Method POST | Out-Null } catch {}
try { Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/disable" -Method POST | Out-Null } catch {}
Start-Sleep -Seconds 1

# 4. Bikin 100 VA baru, prefix ada F-nya biar beda sama Normal
$modeHuruf = if ($mode -eq "baseline") { "B" } else { "P" }
$prefix = "88" + $vu.ToString("00") + $ulang + $modeHuruf + "F"
$csvPath = ((Get-Location).Path + "\" + $folderHasil + "\VA-" + $namaFile + ".csv") -replace '\\','/'
$sqlPath = "$folderHasil\VA-$namaFile.sql"
$vas = @()
$values = @()
for ($i=1; $i -le $jumlahPerSesi; $i++) {
  $va = $prefix + $i.ToString("000")
  $vas += $va
  $bookingId = 4 + (($i - 1) % 10)
  $values += "($bookingId, '$va', (SELECT total_price FROM booking_db.bookings WHERE id = $bookingId), 'PENDING', NOW(), NOW())"
}
$sql = "USE payment_db; DELETE FROM payments WHERE va_number LIKE '$prefix%';`n"
$sql += "INSERT INTO payments (booking_id, va_number, amount, status, created_at, updated_at) VALUES `n"
$sql += ($values -join ",`n") + ";"
$sql | Out-File -FilePath $sqlPath -Encoding utf8
Get-Content $sqlPath | mysql -u $mysqlUser
$vas | Out-File -FilePath $csvPath -Encoding utf8
Write-Host "VA jadi: $csvPath"

# 5. Nyalain fault DULU, baru jalanin JMeter. Fault baru dinyalain SETELAH Bikin-VA biar VA-nya nggak kena fault
if (-not (Enable-Fault)) {
  Write-Host "STOP, fault gagal nyala, data bakal nggak valid kalau dilanjutin"
  exit
}

Write-Host "===== Jalanin JMeter: $nama - VU $vu - Loops $loops - Endpoint $endpoint - Fault $faultType ====="
$jtl = "$folderHasil\DATA-$namaFile.jtl"
try {
  & $jmeterExe -n -t $jmxFile "-Jvu=$vu" "-Jloops=$loops" "-JvaFile=$csvPath" "-Jendpoint=$endpoint" -l $jtl -j "$folderHasil\LOG-$namaFile.log" | Out-Null
  Write-Host "JMeter selesai"
} finally {
  # Wajib mati walau JMeter error / script di-stop di tengah sesi
  Disable-Fault
}

# 6. Hitung + simpan file (sama kayak Normal)
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
  $durasi = [math]::Round((($maxStamp + $maxElapsed - $minStamp) / 1000), 1)
  if ($durasi -le 0) { $durasi = 1 }
  $throughput = [math]::Round($data.Count / $durasi, 2)

  # --- TERMINAL ---
  Write-Host ""
  Write-Host "=========================================================="
  Write-Host "  HASIL $nama"
  Write-Host "=========================================================="
  Write-Host ("  Tanggal  : {0}" -f $tanggal)
  Write-Host ("  Endpoint : {0}  |  VU {1} x Loops {2}" -f $endpoint, $vu, $loops)
  Write-Host ("  Skenario : Failure - Fault {0} NYALA selama sesi" -f $faultType)
  Write-Host ("  Durasi   : {0} detik  |  Throughput: {1} req/detik" -f $durasi, $throughput)
  Write-Host "----------------------------------------------------------"
  Write-Host ("  {0,-12} {1,8} {2,8} {3,8} {4,10}" -f "Total", "Sukses", "Gagal", "Rate", "Avg")
  Write-Host ("  {0,-12} {1,8} {2,8} {3,8} {4,10}" -f $data.Count, $sukses, $gagal, "$rate%", "$avg ms")
  Write-Host "----------------------------------------------------------"
  Write-Host ("  Min: {0} ms  |  P50: {1} ms  |  P95: {2} ms  |  Max: {3} ms" -f $elapsed[0], $p50, $p95, $elapsed[-1])
  Write-Host "=========================================================="

  # --- FILE 1: TXT ---
  $txtPath = "$folderHasil\RINGKASAN-$namaFile.txt"
  $isiTxt = @"
RINGKASAN HASIL PENGUJIAN

Sesi      : $nama
Tanggal   : $tanggal
Skenario  : Failure - Fault $faultType NYALA selama sesi
Mode      : $mode
Endpoint  : $endpoint
VU        : $vu
Loops     : $loops
Total     : $($data.Count) request
Durasi    : $durasi detik
Throughput: $throughput req/detik

HASIL

Total     : $($data.Count)
Sukses    : $sukses
Gagal     : $gagal
Rate      : $rate %
Avg       : $avg ms
Min       : $($elapsed[0]) ms
P50       : $p50 ms
P95       : $p95 ms
Max       : $($elapsed[-1]) ms

FILE

DATA mentah : DATA-$namaFile.jtl
Log JMeter : LOG-$namaFile.log
Data VA    : VA-$namaFile.csv
"@
  $isiTxt | Out-File -FilePath $txtPath -Encoding utf8

  # --- FILE 2: CSV buat Excel ---
  $csvRingkasan = "$folderHasil\RINGKASAN-$namaFile.csv"
  $ringkasan = [PSCustomObject]@{
    Tanggal = $tanggal
    Skenario = $skenario
    Fault = $faultType
    Sesi = $nama
    Mode = $mode
    VU = $vu
    Run = $ulang
    Endpoint = $endpoint
    Total = $data.Count
    Sukses = $sukses
    Gagal = $gagal
    Rate_Persen = $rate
    Avg_ms = $avg
    Min_ms = $elapsed[0]
    P50_ms = $p50
    P95_ms = $p95
    Max_ms = $elapsed[-1]
    Durasi_detik = $durasi
    Throughput = $throughput
  }
  $ringkasan | Export-Csv -Path $csvRingkasan -NoTypeInformation -Encoding UTF8

  # --- FILE 3: REKAP FAILURE (numpuk terus) ---
  $rekap = "jmeter\REKAP-FAILURE-HASIL.csv"
  if (-not (Test-Path $rekap)) {
    $ringkasan | Export-Csv -Path $rekap -NoTypeInformation -Encoding UTF8
  } else {
    $ringkasan | Export-Csv -Path $rekap -NoTypeInformation -Encoding UTF8 -Append
  }

  Write-Host ""
  Write-Host "File yang dibuat:"
  Write-Host "  - $txtPath"
  Write-Host "  - $csvRingkasan"
  Write-Host "  - $jtl"
  Write-Host "  - Rekap Failure: $rekap"
} else {
  Write-Host "JTL tidak ketemu, JMeter gagal"
}
# Jeda FIX 1 
Write-Host ""
Write-Host "Mandeg sek boss 1 Menit"
for ($s=60; $s -gt 0; $s--) {
  Write-Host -NoNewline "`rSisa jeda: $s detik   "
  Start-Sleep -Seconds 1
}
Write-Host ""
Write-Host "Jeda selesai, boleh ganti `$vu / `$mode / `$ulang, jalanin cek-awal.ps1, baru jalanin sesi berikutnya"