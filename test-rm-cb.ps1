# test-rm-cb-otomatis-AUTO.ps1 - FIXED + Bagian 2 FULL OTOMATIS
# Tinggal run: .\test-rm-cb-otomatis-AUTO.ps1
# Bagian 2 sekarang tidak manual lagi: pakai pay-va asli yang sama dengan JMeter
# JMX: POST http://127.0.0.1:8002/api/payments/pay-va  Body: {"va_number":"..."}  Content-Type: application/json
# CircuitBreaker: window 10, threshold 5 gagal (50%), OPEN 30 detik, HALF-OPEN 1 probe
# RetryMechanism: max 3 attempt, jeda 5 detik, onRetry dipanggil di setiap gagal termasuk yang terakhir
# circuit:test: Uji 0 sampai Uji 5 = 6 tahap (Uji 0 simulasi 500,500,200)
$PaymentDir = "D:\Skripsi\BTN Gunung Merbabu\micro-merbabu\payment-service"
$GateUrl = "http://127.0.0.1:8004"
$PaymentUrl = "http://127.0.0.1:8002"
$BookingUrl = "http://127.0.0.1:8001"
$TrackingUrl = "http://127.0.0.1:8003"
$mysqlUser = "root"
$mysqlPass = ""

$waktu = Get-Date -Format "yyyyMMdd-HHmmss"
$OutputFile = "D:\Skripsi\BTN Gunung Merbabu\micro-merbabu\hasil-circuit-$waktu.txt"
$JsonFile = "$PaymentDir\storage\app\circuit_metrics.json"
$LokasiAwal = Get-Location

$folderOutput = Split-Path $OutputFile -Parent
if (-not (Test-Path $folderOutput)) { New-Item -ItemType Directory -Path $folderOutput -Force | Out-Null }

Write-Host "=== TEST RM + CB OTOMATIS - TINGGAL RUN (BAGIAN 2 OTOMATIS) ===" -ForegroundColor Cyan
"=== TEST RM + CB OTOMATIS - $(Get-Date -Format 'dd MMM yyyy HH:mm:ss') ===" | Out-File $OutputFile -Encoding utf8

function Log($msg) {
  Write-Host $msg
  Add-Content -Path $OutputFile -Value $msg -Encoding utf8
}

function Jalankan-Mysql($q) {
  if ($mysqlPass -eq "") { mysql -u $mysqlUser -e $q | Out-Null } else { mysql -u $mysqlUser -p$mysqlPass -e $q | Out-Null }
}

function Bikin-VA-Satu($prefix) {
  # 1 VA baru per fault, prefix beda biar tidak bentrok dengan JMeter (88xxN / 88xxS / 88xxF) dan tidak saling timpa
  # Contoh: 88RML0001 untuk latency, 88RME0001 untuk error
  $va = "$prefix" + "0001"
  Jalankan-Mysql "USE payment_db; DELETE FROM payments WHERE va_number LIKE '$prefix%';"
  Jalankan-Mysql "USE payment_db; INSERT INTO payments (booking_id, va_number, amount, status, created_at, updated_at) SELECT 4, '$va', total_price, 'PENDING', NOW(), NOW() FROM booking_db.Bookings WHERE id = 4;"
  return $va
}

function Set-Fault($type) {
  if ($type -eq "clear") {
    try {
      Invoke-RestMethod -Uri "$GateUrl/api/fault-inject/disable" -Method Post -TimeoutSec 5 | Out-Null
      Log "[Fault] Dimatikan - Gate normal"
    } catch { Log "[Fault] Gagal matikan: $($_.Exception.Message)"; return $false }
  } else {
    try {
      $body = @{ type = $type } | ConvertTo-Json
      Invoke-RestMethod -Uri "$GateUrl/api/fault-inject/enable" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5 | Out-Null
      Log "[Fault] Diaktifkan: $type"
    } catch { Log "[Fault] Gagal aktifkan $type : $($_.Exception.Message)"; return $false }
  }
  try {
    $s = Invoke-RestMethod -Uri "$GateUrl/api/fault-inject/status" -Method Get -TimeoutSec 5
    Log "[Fault] Status sekarang: $($s | ConvertTo-Json -Compress)"
  } catch { Log "[Fault] Status tidak bisa dibaca: $($_.Exception.Message)" }
  return $true
}

function Reset-Circuit {
  try {
    Invoke-RestMethod -Uri "$PaymentUrl/api/circuit/reset" -Method Post -TimeoutSec 5 | Out-Null
    Log "[Circuit] Di-reset ke CLOSED"
    return $true
  } catch { Log "[Circuit] Gagal reset: $($_.Exception.Message)"; return $false }
}

function Get-CircuitState {
  try {
    $s = Invoke-RestMethod -Uri "$PaymentUrl/api/circuit/status" -Method Get -TimeoutSec 5
    return ($s | ConvertTo-Json -Compress)
  } catch { return "tidak bisa dibaca: $($_.Exception.Message)" }
}

function Reset-Sesi-RM {
  Jalankan-Mysql "USE ticket_db; DELETE FROM tickets WHERE booking_id IN (4,5,6,7,8,9,10,11,12,13);"
  Reset-Circuit | Out-Null
  Set-Fault "clear" | Out-Null
  Start-Sleep -Seconds 1
}

function Check-Service($url, $name) {
  try {
    Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 3 | Out-Null
    Log "[Cek] $name jalan - $url"
    return $true
  } catch {
    $pesan = $_.Exception.Message
    if ($pesan -match "refused|Unable to connect|tidak dapat|failed to connect|No connection") {
      Log "[Cek] $name TIDAK JALAN - $url - $pesan"
      return $false
    } else {
      Log "[Cek] $name jalan (balas HTTP error, tapi port kebuka) - $url - $pesan"
      return $true
    }
  }
}

function Invoke-PayVa($vaNumber) {
  # Sama persis dengan JMX: POST /api/payments/pay-va, body {"va_number":"..."}
  # Timeout 60 detik, karena retry bisa makan waktu: 3 attempt x timeout 3 detik + 2 x jeda 5 detik = ~19 detik + overhead
  # Jangan pakai TimeoutSec 3 atau 5, nanti keputus di tengah retry dan dikira gagal padahal retry belum selesai
  $url = "$PaymentUrl/api/payments/pay-va"
  $body = @{ va_number = $vaNumber } | ConvertTo-Json
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $resp = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -TimeoutSec 60
    $sw.Stop()
    $bodyStr = ($resp | ConvertTo-Json -Compress)
    return [PSCustomObject]@{ Sukses = $true; StatusCode = 200; ElapsedMs = [int]$sw.ElapsedMilliseconds; Body = $bodyStr; Va = $vaNumber }
  } catch {
    $sw.Stop()
    $code = 0
    $bodyText = $_.Exception.Message
    try {
      if ($_.Exception.Response) {
        $code = [int]$_.Exception.Response.StatusCode
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $bodyText = $reader.ReadToEnd()
        $reader.Close()
      }
    } catch {}
    return [PSCustomObject]@{ Sukses = $false; StatusCode = $code; ElapsedMs = [int]$sw.ElapsedMilliseconds; Body = $bodyText; Va = $vaNumber }
  }
}

function Tulis-Hasil-PayVa($label, $hasil) {
  $potong = $hasil.Body
  if ($potong.Length -gt 400) { $potong = $potong.Substring(0, 400) + "..." }
  Log "[$label] Hasil pay-va: Sukses=$($hasil.Sukses) HTTP=$($hasil.StatusCode) Elapsed=$($hasil.ElapsedMs) ms VA=$($hasil.Va)"
  Log "[$label] Body: $potong"
  Log "[$label] Circuit sesudah: $(Get-CircuitState)"
}

try {
  # --- 1. CEK SERVICE + PRASYARAT ---
  Log "`n--- 1. CEK 4 SERVICE ---"
  $cek1 = Check-Service "$BookingUrl/api/hiking-routes" "Booking 8001"
  $cek2 = Check-Service "$PaymentUrl/api/circuit/status" "Payment 8002"
  $cek3 = Check-Service "$TrackingUrl/api/tracking/sos" "Tracking 8003"
  $cek4 = Check-Service "$GateUrl/api/fault-inject/status" "Gate 8004"

  if (-not (Get-Command php -ErrorAction SilentlyContinue)) {
    Log "[Cek] PHP tidak ketemu di PATH, batal."
    exit 1
  }
  if (-not (Test-Path $PaymentDir)) {
    Log "[Cek] PaymentDir tidak ketemu: $PaymentDir"
    exit 1
  }
  if (-not ($cek1 -and $cek2 -and $cek3 -and $cek4)) {
    Log "`n[STOP] Ada service yang tidak jalan. circuit:test tidak dijalankan biar hasilnya tidak menyesatkan."
    exit 1
  }

  # --- 2. TEST FAULT INJECTION VIA API - OTOMATIS pakai pay-va asli ---
  Log "`n--- 2. TEST FAULT INJECTION VIA API - OTOMATIS (pay-va asli, sama dengan JMeter) ---"
  Log "Endpoint: POST $PaymentUrl/api/payments/pay-va  Body: {va_number}  Timeout: 60 detik (biar retry 3x sempat selesai)"
  Log "Tiap fault pakai 1 VA baru, biar tidak bentrok."

  # 2a. Latency
  Log "`n[2a] Fault latency ..."
  Reset-Sesi-RM
  $vaLat = Bikin-VA-Satu "88RML"
  Log "[2a] VA baru: $vaLat | Circuit sebelum: $(Get-CircuitState)"
  if (Set-Fault "latency") {
    $hasilLat = Invoke-PayVa $vaLat
    Tulis-Hasil-PayVa "2a-latency" $hasilLat
    Log "[2a] Cara baca: Gate lambat 5 detik, tapi Http::timeout di payment-service 3 detik, jadi tiap attempt timeout."
    Log "[2a] Kalau Elapsed > 8000 ms, berarti retry jalan (3 attempt + jeda 5 detik). Kalau Sukses=true, retry berhasil menyelamatkan."
    Log "[2a] Kalau Sukses=false dan Elapsed ~19000 ms, berarti 3 attempt semua timeout, sesuai desain Retry."
  } else {
    Log "[2a] SKIP karena fault latency gagal nyala."
  }
  Set-Fault "clear" | Out-Null
  Reset-Circuit | Out-Null
  Start-Sleep -Seconds 2

  # 2b. Error
  Log "`n[2b] Fault error ..."
  Reset-Sesi-RM
  $vaErr = Bikin-VA-Satu "88RME"
  Log "[2b] VA baru: $vaErr | Circuit sebelum: $(Get-CircuitState)"
  if (Set-Fault "error") {
    $hasilErr = Invoke-PayVa $vaErr
    Tulis-Hasil-PayVa "2b-error" $hasilErr
    Log "[2b] Cara baca: Gate balas 500, tiap attempt gagal cepat."
    Log "[2b] Kalau Elapsed ~10000 ms, berarti retry 3x jalan (2x jeda 5 detik). Kalau Elapsed < 500 ms dan HTTP 503, berarti sudah Fail Fast karena circuit OPEN."
  } else {
    Log "[2b] SKIP karena fault error gagal nyala."
  }
  Set-Fault "clear" | Out-Null
  Reset-Circuit | Out-Null
  Log "Fault sudah dimatikan, Gate balik normal, circuit sudah CLOSED."

  # --- 3. TEST RM + CB OTOMATIS UJI 0-5 ---
  Log "`n--- 3. JALANIN circuit:test UJI 0-5 OTOMATIS (6 tahap) ---"
  Log "Uji 0 = Retry murni simulasi (500,500,200). Uji 1-5 = Circuit CLOSED, OPEN, Fail Fast, HALF-OPEN pulih, HALF-OPEN gagal."
  Log "Uji 4 dan Uji 5 masing-masing ada countdown 30 detik. Total sekitar 2-3 menit, jangan di-close..."
  Log "Catatan: circuit:test tidak pakai fault-inject 8004, dia pakai Gate UP 8004 dan Gate DOWN 8999 (port mati)."

  if (Test-Path $JsonFile) {
    $backupJson = "$PaymentDir\storage\app\circuit_metrics-backup-$waktu.json"
    Copy-Item $JsonFile $backupJson -Force
    Log "[JSON] Backup JSON lama ke: $backupJson"
  }

  Set-Fault "clear" | Out-Null
  Reset-Circuit | Out-Null

  Push-Location $PaymentDir
  try {
    Write-Host "`n--- output circuit:test (live) ---" -ForegroundColor Cyan
    php artisan circuit:test | Tee-Object -Variable testOutput
    $testOutput | Add-Content -Path $OutputFile -Encoding utf8
    $kodeKeluar = $LASTEXITCODE
    Log "`n[circuit:test] Exit code: $kodeKeluar"
  } finally {
    Pop-Location
  }
  try { Set-Location $LokasiAwal } catch {}

  # --- 3b. REKAP OTOMATIS Uji 0-5 ---
  Log "`n--- 3b. REKAP UJI 0-5 ---"
  if ($null -eq $testOutput -or $testOutput.Count -eq 0) {
    Log "[Rekap] TIDAK ADA OUTPUT dari circuit:test. Kemungkinan artisan crash / service mati di tengah."
  } else {
    $jumlahPass = @($testOutput | Where-Object { $_ -match "HASIL: PASS" }).Count
    $jumlahFail = @($testOutput | Where-Object { $_ -match "HASIL: FAIL" }).Count
    $barisUji = @($testOutput | Where-Object { $_ -match "\[UJI [0-9]\]" })
    foreach ($b in $barisUji) { Log "[Rekap] $b" }
    Log "[Rekap] PASS: $jumlahPass | FAIL: $jumlahFail | Harapan: 6 PASS (Uji 0-5)"
    if ($jumlahFail -gt 0) {
      Log "[Rekap] ADA YANG FAIL - jangan dipakai buat Bab 4 dulu, cek baris FAIL di atas."
    } elseif ($jumlahPass -ge 6) {
      Log "[Rekap] Uji 0-5 PASS semua."
    } else {
      Log "[Rekap] Hasil tidak jelas (PASS < 6 dan FAIL = 0). Cek output lengkap di file."
    }
  }

  if (Test-Path $JsonFile) {
    $info = Get-Item $JsonFile
    Log "[JSON] Ada: $JsonFile"
    Log "[JSON] Update terakhir: $($info.LastWriteTime) | Ukuran: $($info.Length) byte"
    try {
      $dataJson = Get-Content $JsonFile -Raw | ConvertFrom-Json
      Log "[JSON] Isi valid JSON, kunci atas: $(($dataJson.PSObject.Properties.Name) -join ', ')"
    } catch { Log "[JSON] File ada tapi bukan JSON valid: $($_.Exception.Message)" }
  } else {
    Log "[JSON] TIDAK KETEMU: $JsonFile - circuit:test mungkin tidak menulis JSON."
  }

  Log "`n--- 4. SELESAI ---"
  Log "File hasil TXT: $OutputFile"
  Log "File JSON buat Bab 4: $JsonFile"
  Write-Host "`nSelesai! Cek file $OutputFile" -ForegroundColor Green
}
finally {
  Set-Fault "clear" | Out-Null
  Reset-Circuit | Out-Null
  try { Set-Location $LokasiAwal } catch {}
}
