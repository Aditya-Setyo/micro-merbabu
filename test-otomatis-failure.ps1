# test-otomatis-failure.ps1 - 6 sesi per Run
# 6 sesi = Baseline VU 10,25,50 + Proposed VU 10,25,50. Fault error nyala selama 1 sesi, habis itu dimatiin.
# Simpan ke: jmeter\hasil-failure-TANGGAL  |  Struktur + ringkasan disamakan dengan test-otomatis-normal.ps1 dan test-otomatis-slow.ps1
# Ubah $jumlahRun = 3 kalau mau pengulangan sama seperti normal (biar bisa dirata-rata)
$mysqlUser = "root"
$mysqlPass = ""
$jmeterExe = "D:\Skripsi\apache-jmeter-5.6.3\bin\jmeter.bat"
$jmxFile = "jmeter\payva-test.jmx"
$totalRequest = 100
$jumlahRun = 1

$waktu = Get-Date -Format "yyyyMMdd-HHmmss"
$folderHasil = "jmeter\hasil-failure-$waktu"
New-Item -ItemType Directory -Path $folderHasil -Force | Out-Null
$summaryCsv = "$folderHasil\ringkasan-failure.csv"
$summaryTxt = "$folderHasil\ringkasan-failure.txt"

# Header file CSV (buat Excel, kolom sama persis dengan normal + slow biar gampang digabung)
"Sesi,Mode,VU,Run,Endpoint,Total,Sukses,Gagal,SuccessRate,Avg_ms,Min_ms,Max_ms,P95_ms,Throughput" | Out-File -FilePath $summaryCsv -Encoding utf8

# Header file TXT (buat dibaca, rapih)
@"

  HASIL PENGUJIAN FAILURE / ERROR - BTN Gunung Merbabu
  Tanggal: $(Get-Date -Format "dd MMM yyyy HH:mm:ss")
  Skenario: Baseline vs Proposed | 100 request per sesi | Fault: error (nyala selama 1 sesi)
  Folder: $folderHasil

"@ | Out-File -FilePath $summaryTxt -Encoding utf8

function Tulis-HeaderTabel {
    Write-Host ""
    Write-Host ("{0,-28} {1,5} {2,6} {3,6} {4,8} {5,9} {6,8} {7,9}" -f "Sesi", "Total", "Sukses", "Gagal", "Avg(ms)", "P95(ms)", "Rate(%)", "Thr/s")
    Write-Host ("-" * 85)
    ("{0,-28} {1,5} {2,6} {3,6} {4,8} {5,9} {6,8} {7,9}" -f "Sesi", "Total", "Sukses", "Gagal", "Avg(ms)", "P95(ms)", "Rate(%)", "Thr/s") | Add-Content -Path $summaryTxt
    ("-" * 85) | Add-Content -Path $summaryTxt
}

function Jalankan-Mysql($q) {
    # | Out-Null penting: biar output mysql tidak mengotori return value Bikin-VA
    if ($mysqlPass -eq "") { mysql -u $mysqlUser -e $q | Out-Null } else { mysql -u $mysqlUser -p$mysqlPass -e $q | Out-Null }
}

function Bikin-VA($jumlah, $prefix) {
    $csvPath = "$folderHasil\va-$prefix.csv"
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

function Enable-Fault {
    try {
        Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/enable" -Method POST -Body '{"type":"error"}' -ContentType "application/json" | Out-Null
        Start-Sleep -Seconds 2
        return $true
    } catch {
        Write-Host "GAGAL enable error: $_"
        return $false
    }
}

function Disable-Fault {
    try { Invoke-RestMethod -Uri "http://127.0.0.1:8004/api/fault-inject/disable" -Method POST | Out-Null } catch {}
    try { Invoke-RestMethod -Uri "http://127.0.0.1:8002/api/circuit/reset" -Method POST | Out-Null } catch {}
    # Di skenario error, circuit breaker bisa dalam keadaan OPEN setelah banyak gagal.
    # Kasih jeda biar benar-benar balik CLOSED sebelum sesi berikutnya.
    Start-Sleep -Seconds 2
}

function Hitung-Hasil($jtlPath, $nama, $mode, $vu, $ulang, $endpoint) {
    if (-not (Test-Path $jtlPath)) {
        Write-Host ("{0,-28} {1,5} {2,6} {3,6} {4,8} {5,9} {6,8} {7,9}" -f $nama, 0, 0, 0, 0, 0, 0, 0)
        ("{0,-28} {1,5} {2,6} {3,6} {4,8} {5,9} {6,8} {7,9}" -f $nama, 0, 0, 0, 0, 0, 0, 0) | Add-Content -Path $summaryTxt
        "$nama,$mode,$vu,$ulang,$endpoint,0,0,0,0,0,0,0,0,0" | Add-Content -Path $summaryCsv
        return
    }
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

    $baris = ("{0,-28} {1,5} {2,6} {3,6} {4,8} {5,9} {6,8} {7,9}" -f $nama, $total, $sukses, $gagal, $avg, $p95, $rate, $throughput)
    Write-Host $baris
    $baris | Add-Content -Path $summaryTxt
    "$nama,$mode,$vu,$ulang,$endpoint,$total,$sukses,$gagal,$rate,$avg,$min,$max,$p95,$throughput" | Add-Content -Path $summaryCsv
}

if (-not (Test-Path $jmeterExe)) { Write-Host "JMeter tidak ketemu: $jmeterExe"; exit 1 }
if (-not (Test-Path $jmxFile)) { Write-Host "JMX tidak ketemu: $jmxFile"; exit 1 }

for ($ulang=1; $ulang -le $jumlahRun; $ulang++) {
    Write-Host ""
    Write-Host "########## Failure-Run$ulang - VU 10,25,50 Baseline + Proposed | Fault error ##########"
    "" | Add-Content -Path $summaryTxt
    "########## Failure-Run$ulang ##########" | Add-Content -Path $summaryTxt
    Tulis-HeaderTabel

    foreach ($mode in @("baseline","proposed")) {
        $endpoint = if ($mode -eq "baseline") { "pay-va-baseline" } else { "pay-va" }
        $kodeMode = if ($mode -eq "baseline") { "B" } else { "P" }
        foreach ($vu in @(10,25,50)) {
            $nama = "Failure-${mode}-VU${vu}-Run${ulang}"
            Write-Host "===== $nama ====="
            Reset-Sesi

            # Prefix unik per mode + VU + Run, biar tidak saling timpa / hapus
            # Contoh: Baseline VU10 Run1 = 8810BF1, Proposed VU10 Run1 = 8810PF1
            $prefix = "88${vu}${kodeMode}F${ulang}"
            $csv = Bikin-VA -jumlah $totalRequest -prefix $prefix
            $loops = [int]($totalRequest / $vu)
            $jtlTemp = "$folderHasil\$nama.jtl"
            $logTemp = "$folderHasil\$nama.log"

            # Fault baru dinyalakan SETELAH Bikin-VA, tepat sebelum JMeter
            if (-not (Enable-Fault)) {
                Write-Host "SKIP $nama karena fault gagal nyala, data akan tidak valid"
                continue
            }

            try {
                & $jmeterExe -n -t $jmxFile "-Jvu=$vu" "-Jloops=$loops" "-JvaFile=$csv" "-Jendpoint=$endpoint" -l $jtlTemp -j $logTemp | Out-Null
            } finally {
                # Wajib mati walau JMeter error / script di-stop di tengah sesi
                Disable-Fault
            }

            Hitung-Hasil -jtlPath $jtlTemp -nama $nama -mode $mode -vu $vu -ulang $ulang -endpoint $endpoint
            Start-Sleep -Seconds 1
        }
    }
}

Write-Host ""
Write-Host "================================================================================="
Write-Host "Test Failure"
Write-Host "Folder hasil: $folderHasil"
Write-Host "File ringkasan: $summaryCsv (Excel) + $summaryTxt (rapih)"
Write-Host "================================================================================="
Write-Host ""
Import-Csv $summaryCsv | Format-Table -AutoSize
