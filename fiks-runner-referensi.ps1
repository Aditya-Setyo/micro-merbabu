# test-1-baseline-otomatis.ps1
# 1 sesi aja buat ngetes otomatisnya
# Baseline - VU 10 - 100 request - Tanpa fault - Tanpa Retry/CB
$ErrorActionPreference = "Continue"
$jmeterExe = "D:\Skripsi\apache-jmeter-5.6.3\bin\jmeter.bat"
$jmxFile = "jmeter\payva-test.jmx"
$mysqlUser = "root"
$mysqlPass = ""
$jumlahPerSesi = 100
$vu = 10
$loops = $jumlahPerSesi / $vu # 100
$endpoint = "pay-va-baseline"
$nama = "Baseline-VU10-Run1"

$waktu = Get-Date -Format "yyyyMMdd-HHmmss"
$folderHasil = "hasil-1-baseline-$waktu"
New-Item -ItemType Directory -Path $folderHasil | Out-Null
Write-Host "Folder hasil: $folderHasil"

function Jalankan-Mysql($q) {
  if ($mysqlPass -eq "") { mysql -u $mysqlUser -e $q } else { mysql -u $mysqlUser -p$mysqlPass -e $q }
}

# 1. Cek file
if (-not (Test-Path $jmeterExe)) { Write-Host "JMeter tidak ketemu"; exit }
if (-not (Test-Path $jmxFile)) { Write-Host "JMX tidak ketemu di $jmxFile - simpan dulu payva-test.jmx di folder jmeter"; exit }

# 2. Cek service
try {
  Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/status" -TimeoutSec 5 | Out-Null
  Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/status" -TimeoutSec 5 | Out-Null
  Write-Host "Service jalan"
} catch { Write-Host "Service belum jalan, jalanin dulu 4 service"; exit }

# 3. Reset: hapus tiket lama, reset CB, matiin fault
Write-Host "Reset..."
Jalankan-Mysql "USE ticket_db; DELETE FROM tickets WHERE booking_id IN (4,5,6,7,8,9,10,11,12,13);"
Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/reset" -Method POST | Out-Null
Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/disable" -Method POST | Out-Null
Start-Sleep -Seconds 1

# 4. Bikin 100 VA baru, 1x panggil MySQL aja
# Prefix 881010 = 88 + VU 10 + Run 1 + 0, jadi VA-nya 8810100001 sampai 8810101000
Write-Host "Bikin 100 VA baru..."
$prefix6 = "881010"
$csvPath = ((Get-Location).Path + "\" + $folderHasil + "\va-" + $prefix6 + ".csv") -replace '\\','/'
$sqlPath = "$folderHasil\va-$prefix6.sql"
$vas = @()
$values = @()
for ($i=1; $i -le $jumlahPerSesi; $i++) {
  $va = "$prefix6" + $i.ToString("0000")
  $vas += $va
  $bookingId = 4 + (($i - 1) % 10)
  $values += "($bookingId, '$va', (SELECT total_price FROM booking_db.bookings WHERE id = $bookingId), 'PENDING', NOW(), NOW())"
}
$sql = "USE payment_db; DELETE FROM payments WHERE va_number LIKE '$prefix6%';`n"
$sql += "INSERT INTO payments (booking_id, va_number, amount, status, created_at, updated_at) VALUES `n"
$sql += ($values -join ",`n") + ";"
$sql | Out-File -FilePath $sqlPath -Encoding utf8
Get-Content $sqlPath | mysql -u $mysqlUser
$vas | Out-File -FilePath $csvPath -Encoding utf8
Write-Host "VA jadi, file: $csvPath"

# 5. Jalanin JMeter 1 sesi Baseline
Write-Host "===== Jalanin JMeter: $nama - VU $vu - Loops $loops - Endpoint $endpoint ====="
$jtl = "$folderHasil\$nama.jtl"
& $jmeterExe -n -t $jmxFile "-Jvu=$vu" "-Jloops=$loops" "-JvaFile=$csvPath" "-Jendpoint=$endpoint" -l $jtl -j "$folderHasil\$nama.log"
Write-Host "JMeter selesai"

# 6. Matiin fault + reset lagi biar bersih
Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/disable" -Method POST | Out-Null
Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/reset" -Method POST | Out-Null

# 7. Hitung ringkasan dari .jtl
if (Test-Path $jtl) {
  $data = Import-Csv -Path $jtl
  $elapsed = $data.elapsed | ForEach-Object { [int]$_ } | Sort-Object
  $sukses = ($data | Where-Object { $_.success -eq "true" }).Count
  $avg = [math]::Round(($elapsed | Measure-Object -Average).Average, 2)
  $p95Index = [math]::Floor($elapsed.Count * 0.95)
  if ($p95Index -ge $elapsed.Count) { $p95Index = $elapsed.Count - 1 }
  Write-Host "===== HASIL $nama ====="
  Write-Host "Total: $($data.Count), Sukses: $sukses, Gagal: $($data.Count - $sukses)"
  Write-Host "Avg: $avg ms, Min: $($elapsed[0]) ms, Max: $($elapsed[-1]) ms, P95: $($elapsed[$p95Index]) ms"
  Write-Host "Cek folder: $folderHasil"
} else {
  Write-Host "JTL tidak ketemu, JMeter gagal"
}
