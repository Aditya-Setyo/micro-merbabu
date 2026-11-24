# test-otomatis-normal.ps1 - 3x Pengujian - 100 request per sesi
# Simpan ke: jmeter\hasil-normal-TANGGAL\  | 1 file = 1x Pengujian (Run)
$mysqlUser = "root"
$mysqlPass = ""
$jmeterExe = "D:\Skripsi\apache-jmeter-5.6.3\bin\jmeter.bat"
$jmxFile = "jmeter\payva-test.jmx"
$totalRequest = 100

$waktu = Get-Date -Format "yyyyMMdd-HHmmss"
$folderHasil = "jmeter\hasil-normal-$waktu"
New-Item -ItemType Directory -Path $folderHasil -Force | Out-Null
$summaryCsv = "$folderHasil\ringkasan-normal.csv"
$summaryTxt = "$folderHasil\ringkasan-normal.txt"

# Header file CSV (buat Excel)
"Sesi,Mode,VU,Run,Endpoint,Total,Sukses,Gagal,SuccessRate,Avg_ms,Min_ms,Max_ms,P95_ms,Throughput" | Out-File -FilePath $summaryCsv -Encoding utf8

# Header file TXT (buat dibaca, rapih)
@"

  HASIL PENGUJIAN NORMAL - BTN Gunung Merbabu
  Tanggal: $(Get-Date -Format "dd MMM yyyy HH:mm:ss")
  Skenario: Baseline vs Proposed | 100 request per sesi | 3x Pengulangan
  Folder: $folderHasil

"@ | Out-File -FilePath $summaryTxt -Encoding utf8

# Header tabel di terminal
function Tulis-HeaderTabel {
    Write-Host ""
    Write-Host ("{0,-28} {1,5} {2,6} {3,6} {4,8} {5,9} {6,8} {7,9}" -f "Sesi", "Total", "Sukses", "Gagal", "Avg(ms)", "P95(ms)", "Rate(%)", "Thr/s")
    Write-Host ("-" * 85)
    ("{0,-28} {1,5} {2,6} {3,6} {4,8} {5,9} {6,8} {7,9}" -f "Sesi", "Total", "Sukses", "Gagal", "Avg(ms)", "P95(ms)", "Rate(%)", "Thr/s") | Add-Content -Path $summaryTxt
    ("-" * 85) | Add-Content -Path $summaryTxt
}

function Jalankan-Mysql($q) {
    if ($mysqlPass -eq "") { mysql -u $mysqlUser -e $q } else { mysql -u $mysqlUser -p$mysqlPass -e $q }
}

function Bikin-VA($jumlah, $prefix) {
    $csvPath = "$env:TEMP\va-$prefix.csv"
    $vas = @()
    Jalankan-Mysql "USE payment_db; DELETE FROM payments WHERE va_number LIKE '$prefix%';"
    for ($i=1; $i -le $jumlah; $i++) {
        $va = "$prefix" + $i.ToString("0000")
        $vas += $va
        $bookingId = 4 + (($i - 1) % 10)
        Jalankan-Mysql "USE payment_db; INSERT INTO payments (booking_id, va_number, amount, status, created_at, updated_at) SELECT $bookingId, '$va', total_price, 'PENDING', NOW(), NOW() FROM booking_db.Bookings WHERE id = $bookingId;"
    }
    $vas | Out-File -FilePath $csvPath -Encoding utf8
    return $csvPath
}

function Reset-Sesi {
    Jalankan-Mysql "USE ticket_db; DELETE FROM tickets WHERE booking_id IN (4,5,6,7,8,9,10,11,12,13);"
    try { Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/reset" -Method POST | Out-Null } catch {}
    try { Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/disable" -Method POST | Out-Null } catch {}
    Start-Sleep -Seconds 1
}

function Hitung-Hasil($jtlPath, $nama, $mode, $vu, $ulang, $endpoint) {
    $data = Import-Csv $jtlPath
    $total = $data.Count
    if ($total -eq 0) {
        Write-Host ("{0,-28} {1,5} {2,6} {3,6} {4,8} {5,9} {6,8} {7,9}" -f $nama, 0, 0, 0, 0, 0, 0, 0)
        ("{0,-28} {1,5} {2,6} {3,6} {4,8} {5,9} {6,8} {7,9}" -f $nama, 0, 0, 0, 0, 0, 0, 0) | Add-Content -Path $summaryTxt
        "$nama,$mode,$vu,$ulang,$endpoint,0,0,0,0,0,0,0,0,0" | Add-Content -Path $summaryCsv
        return
    }
    $sukses = ($data | Where-Object { $_.success -eq "true" }).Count
    $gagal = $total - $sukses
    $rate = [math]::Round(($sukses / $total * 100), 1)
    $elapsed = @($data | ForEach-Object { [int]$_.elapsed } | Sort-Object)
    $avg = [math]::Round(($elapsed | Measure-Object -Average).Average, 1)
    $min = ($elapsed | Measure-Object -Minimum).Minimum
    $max = ($elapsed | Measure-Object -Maximum).Maximum
    $idx95 = [int][math]::Ceiling($elapsed.Count * 0.95) - 1
    if ($idx95 -lt 0) { $idx95 = 0 }
    $p95 = $elapsed[$idx95]
    $stamps = @($data | ForEach-Object { [long]$_.timeStamp })
    $durasi = ((($stamps | Measure-Object -Maximum).Maximum - ($stamps | Measure-Object -Minimum).Minimum) / 1000)
    if ($durasi -le 0) { $durasi = 1 }
    $throughput = [math]::Round($total / $durasi, 2)

    # 1 baris rapih di terminal + di TXT
    $baris = ("{0,-28} {1,5} {2,6} {3,6} {4,8} {5,9} {6,8} {7,9}" -f $nama, $total, $sukses, $gagal, $avg, $p95, $rate, $throughput)
    Write-Host $baris
    $baris | Add-Content -Path $summaryTxt
    "$nama,$mode,$vu,$ulang,$endpoint,$total,$sukses,$gagal,$rate,$avg,$min,$max,$p95,$throughput" | Add-Content -Path $summaryCsv
}

for ($ulang=1; $ulang -le 3; $ulang++) {
    $namaRun = "Normal-Run$ulang"
    $jtlGabung = "$folderHasil\$namaRun.jtl"
    $logGabung = "$folderHasil\$namaRun.log"
    $vaGabung = "$folderHasil\va-$namaRun.csv"
    Write-Host ""
    Write-Host "########## $namaRun - VU 10,25,50,100 Baseline + Proposed ##########"
    "" | Add-Content -Path $summaryTxt
    "########## $namaRun ##########" | Add-Content -Path $summaryTxt
    Tulis-HeaderTabel

    foreach ($mode in @("baseline","proposed")) {
        $endpoint = if ($mode -eq "baseline") { "pay-va-baseline" } else { "pay-va" }
        foreach ($vu in @(10,25,50,100)) {
            $nama = "Normal-${mode}-VU${vu}-Run${ulang}"
            Reset-Sesi
            $csvTemp = Bikin-VA -jumlah $totalRequest -prefix "88${vu}${ulang}N"
            $loops = [int]($totalRequest / $vu)
            $jtlTemp = "$env:TEMP\$nama.jtl"
            $logTemp = "$env:TEMP\$nama.log"
            if (Test-Path $jtlTemp) { Remove-Item $jtlTemp }
            if (Test-Path $logTemp) { Remove-Item $logTemp }
            & $jmeterExe -n -t $jmxFile "-Jvu=$vu" "-Jloops=$loops" "-JvaFile=$csvTemp" "-Jendpoint=$endpoint" -l $jtlTemp -j $logTemp | Out-Null

            Hitung-Hasil -jtlPath $jtlTemp -nama $nama -mode $mode -vu $vu -ulang $ulang -endpoint $endpoint

            if (Test-Path $jtlTemp) {
                if (-not (Test-Path $jtlGabung)) { Copy-Item $jtlTemp -Destination $jtlGabung }
                else { Get-Content $jtlTemp | Select-Object -Skip 1 | Add-Content -Path $jtlGabung }
            }
            if (Test-Path $logTemp) { Get-Content $logTemp | Add-Content -Path $logGabung }
            if (Test-Path $csvTemp) { Get-Content $csvTemp | Add-Content -Path $vaGabung }
            Remove-Item $jtlTemp -ErrorAction SilentlyContinue
            Remove-Item $logTemp -ErrorAction SilentlyContinue
            Remove-Item $csvTemp -ErrorAction SilentlyContinue
        }
    }
    Write-Host "-> File Run ini: $jtlGabung"
}
Write-Host ""
Write-Host "================================================================================="
Write-Host "Test Normal"
Write-Host "Folder hasil: $folderHasil"
Write-Host "File ringkasan: $summaryCsv (Excel) + $summaryTxt (rapih)"
Write-Host "================================================================================="
Write-Host ""
Import-Csv $summaryCsv | Format-Table -AutoSize
