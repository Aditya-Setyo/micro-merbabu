$vu = 10 # <-- GANTI: 10 / 25 / 50 / 100
$mode = "proposed"    # <-- GANTI: "baseline" atau "proposed"
$ulang = 1 # <-- GANTI: 1 / 2 / 3
# ============================================================

$ErrorActionPreference = "Continue"
$jmeterExe = "D:\Skripsi\apache-jmeter-5.6.3\bin\jmeter.bat"
$jmxFile = "jmeter\payva-test.jmx"
$mysqlUser = "root"
$mysqlPass = ""
$jumlahPerSesi = 100
$loops = [int]($jumlahPerSesi / $vu)
$endpoint = if ($mode -eq "baseline") { "pay-va-baseline" } else { "pay-va" }
$nama = "Normal-${mode}-VU${vu}-Run${ulang}"

$waktu = Get-Date -Format "yyyyMMdd-HHmmss"
$tanggal = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$folderHasil = "jmeter\hasil\$nama-$waktu"
$namaFile = "$nama-$waktu"
New-Item -ItemType Directory -Path $folderHasil -Force | Out-Null
Write-Host "Folder hasil: $folderHasil"
Write-Host "Sesi: $nama - VU $vu x Loops $loops = $jumlahPerSesi request - Endpoint $endpoint"

function Jalankan-Mysql($q) {
  if ($mysqlPass -eq "") { mysql -u $mysqlUser -e $q } else { mysql -u $mysqlUser -p$mysqlPass -e $q }
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

# 3. Reset - FIX: pakai BKG- (id 141-240), bukan 4-13
Write-Host "Reset..."
# Balikin 100 payments BKG- jadi PENDING (datanya udah bener di DB, jangan INSERT baru)
Jalankan-Mysql "USE payment_db; UPDATE payments SET status='PENDING' WHERE booking_id IN (SELECT id FROM booking_db.bookings WHERE booking_code LIKE 'BKG-%');"
# Hapus tiket BKG- dari run sebelumnya
Jalankan-Mysql "USE ticket_db; DELETE FROM tickets WHERE booking_id IN (SELECT id FROM booking_db.bookings WHERE booking_code LIKE 'BKG-%');"
try { Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/reset" -Method POST | Out-Null } catch {}
try { Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/disable" -Method POST | Out-Null } catch {}
Start-Sleep -Seconds 1

# 4. Ambil 100 VA DARI DATABASE 
# VA di DB udah bener: 8800 + booking_id, contoh 8800000141 - 8800000240
$csvPath = ((Get-Location).Path + "\" + $folderHasil + "\VA-" + $namaFile + ".csv") -replace '\\','/'
$sqlPath = "$folderHasil\VA-$namaFile.sql"
# Simpan query-nya aja buat bukti, bukan INSERT yang bikin VA ngawur
"USE payment_db; SELECT va_number FROM payments WHERE booking_id IN (SELECT id FROM booking_db.bookings WHERE booking_code LIKE 'BKG-%') ORDER BY booking_id;" | Out-File -FilePath $sqlPath -Encoding utf8
# Generate CSV langsung dari DB
mysql -u $mysqlUser -N -e "USE payment_db; SELECT va_number FROM payments WHERE booking_id IN (SELECT id FROM booking_db.bookings WHERE booking_code LIKE 'BKG-%') ORDER BY booking_id;" | Out-File -FilePath $csvPath -Encoding ascii
# Cek: harusnya 100 baris, pertama 8800000141
$vasCek = Get-Content $csvPath
Write-Host "VA jadi: $csvPath ($($vasCek.Count) baris, pertama: $($vasCek[0]))"
if ($vasCek.Count -ne 100 -or $vasCek[0] -ne "8800000141") {
  Write-Host "[GAGAL] VA dari DB tidak bener! Harusnya 100 baris mulai 8800000141. Cek DB dulu." -ForegroundColor Red
  exit
}

# 5. Jalanin JMeter 1 sesi
Write-Host "===== Jalanin JMeter: $nama - VU $vu - Loops $loops - Endpoint $endpoint ====="
$jtl = "$folderHasil\DATA-$namaFile.jtl"
& $jmeterExe -n -t $jmxFile "-Jvu=$vu" "-Jloops=$loops" "-JvaFile=$csvPath" "-Jendpoint=$endpoint" -l $jtl -j "$folderHasil\LOG-$namaFile.log" | Out-Null
Write-Host "JMeter selesai"

# 6. Bersihin fault + reset lagi
try { Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/disable" -Method POST | Out-Null } catch {}
try { Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/reset" -Method POST | Out-Null } catch {}

# 7. Hitung + simpan file
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
  # FIX Durasi: pakai Min/Max timeStamp + elapsed, bukan variabel $maxStamp yang nggak ada
  $minStamp = ($data.timeStamp | ForEach-Object { [long]$_ } | Measure-Object -Minimum).Minimum
  $maxEnd = ($data | ForEach-Object { [long]$_.timeStamp + [long]$_.elapsed } | Measure-Object -Maximum).Maximum
  $durasi = [math]::Round((($maxEnd - $minStamp) / 1000), 1)

  # --- TERMINAL ---
  Write-Host ""
  Write-Host "=========================================================="
  Write-Host "  HASIL $nama"
  Write-Host "=========================================================="
  Write-Host ("  Tanggal  : {0}" -f $tanggal)
  Write-Host ("  Endpoint : {0}  |  VU {1} x Loops {2}" -f $endpoint, $vu, $loops)
  Write-Host ("  Durasi   : {0} detik" -f $durasi)
  Write-Host "----------------------------------------------------------"
  Write-Host ("  {0,-12} {1,8} {2,8} {3,8} {4,10}" -f "Total", "Sukses", "Gagal", "Rate", "Avg")
  Write-Host ("  {0,-12} {1,8} {2,8} {3,8} {4,10}" -f $data.Count, $sukses, $gagal, "$rate%", "$avg ms")
  Write-Host "----------------------------------------------------------"
  Write-Host ("  Min: {0} ms  |  P50: {1} ms  |  P95: {2} ms  |  Max: {3} ms" -f $elapsed[0], $p50, $p95, $elapsed[-1])
  Write-Host "=========================================================="

  # --- FILE 1: TXT buat dibaca manusia ---
  $txtPath = "$folderHasil\RINGKASAN-$namaFile.txt"
  $isiTxt = @"
RINGKASAN HASIL PENGUJIAN

Sesi      : $nama
Tanggal   : $tanggal
Mode      : $mode
Endpoint  : $endpoint
VU        : $vu
Loops     : $loops
Total     : $($data.Count) request
Durasi    : $durasi detik

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
  }
  $ringkasan | Export-Csv -Path $csvRingkasan -NoTypeInformation -Encoding UTF8

  # --- FILE 3: REKAP SEMUA (numpuk terus, 1 file aja) ---
  $rekap = "jmeter\REKAP-SEMUA-HASIL.csv"
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
  Write-Host "  - Rekap semua: $rekap"
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
