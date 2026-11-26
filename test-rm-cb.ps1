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
Write-Host "=== TEST RM + CB OTOMATIS - PAKAI VA ASLI ===" -ForegroundColor Cyan
"=== TEST RM + CB OTOMATIS - $(Get-Date -Format 'dd MMM yyyy HH:mm:ss') ===" | Out-File $OutputFile -Encoding utf8
function Log($msg) { Write-Host $msg; Add-Content -Path $OutputFile -Value $msg -Encoding utf8 }
function Jalankan-Mysql($q) { if ($mysqlPass -eq "") { mysql -u $mysqlUser -e $q | Out-Null } else { mysql -u $mysqlUser -p$mysqlPass -e $q | Out-Null } }
function Siapkan-VA-Asli($bookingId, $va) {
  # Pakai payment yang sudah ada, jangan INSERT baru. Reset ke PENDING, hapus tiketnya.
  Jalankan-Mysql "USE payment_db; UPDATE payments SET status='PENDING' WHERE booking_id=$bookingId AND va_number='$va';"
  Jalankan-Mysql "USE ticket_db; DELETE FROM tickets WHERE booking_id=$bookingId;"
  Start-Sleep -Seconds 1
  $cek = mysql -u $mysqlUser -N -e "USE payment_db; SELECT status FROM payments WHERE va_number='$va';"
  if ($cek.Trim() -ne "PENDING") { Log "[GAGAL] VA $va tidak bisa di-reset ke PENDING. Status: $cek"; return $false }
  Log "[OK] VA $va disiapkan: booking_id $bookingId, status PENDING, tiket dihapus"
  return $true
}
function Set-Fault($type) {
  if ($type -eq "clear") {
    try { Invoke-RestMethod -Uri "$GateUrl/api/fault-inject/disable" -Method Post -TimeoutSec 5 | Out-Null; Log "[Fault] Dimatikan - Gate normal" } catch { Log "[Fault] Gagal matikan: $($_.Exception.Message)"; return $false }
  } else {
    try { $body = @{ type = $type } | ConvertTo-Json; Invoke-RestMethod -Uri "$GateUrl/api/fault-inject/enable" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5 | Out-Null; Log "[Fault] Diaktifkan: $type" } catch { Log "[Fault] Gagal aktifkan $type : $($_.Exception.Message)"; return $false }
  }
  try { $s = Invoke-RestMethod -Uri "$GateUrl/api/fault-inject/status" -Method Get -TimeoutSec 5; Log "[Fault] Status sekarang: $($s | ConvertTo-Json -Compress)" } catch { Log "[Fault] Status tidak bisa dibaca" }
  return $true
}
function Reset-Circuit { try { Invoke-RestMethod -Uri "$PaymentUrl/api/circuit/reset" -Method Post -TimeoutSec 5 | Out-Null; Log "[Circuit] Di-reset ke CLOSED"; return $true } catch { Log "[Circuit] Gagal reset"; return $false } }
function Get-CircuitState { try { $s = Invoke-RestMethod -Uri "$PaymentUrl/api/circuit/status" -Method Get -TimeoutSec 5; return ($s | ConvertTo-Json -Compress) } catch { return "tidak bisa dibaca" } }
function Reset-Sesi-RM { Reset-Circuit | Out-Null; Set-Fault "clear" | Out-Null; Start-Sleep -Seconds 1 }
function Check-Service($url, $name) {
  try { Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 3 | Out-Null; Log "[Cek] $name jalan - $url"; return $true } catch {
    $pesan = $_.Exception.Message
    if ($pesan -match "refused|Unable to connect|tidak dapat|failed to connect|No connection") { Log "[Cek] $name TIDAK JALAN - $url"; return $false } else { Log "[Cek] $name jalan (balas HTTP error, tapi port kebuka) - $url"; return $true }
  }
}
function Invoke-PayVa($vaNumber) {
  $url = "$PaymentUrl/api/payments/pay-va"
  $body = @{ va_number = $vaNumber } | ConvertTo-Json
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $resp = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -TimeoutSec 60
    $sw.Stop()
    $bodyStr = ($resp | ConvertTo-Json -Compress)
    # Cek tiket, bukan hanya HTTP 200. PaymentController yang baru mengembalikan 200 hanya jika tiket terbuat.
    $tiketOk = $false
    if ($resp.gate_service_response -and $resp.gate_service_response.success -eq $true) { $tiketOk = $true }
    return [PSCustomObject]@{ SuksesHTTP = $true; TiketOk = $tiketOk; StatusCode = 200; ElapsedMs = [int]$sw.ElapsedMilliseconds; Body = $bodyStr; Va = $vaNumber }
  } catch {
    $sw.Stop(); $code = 0; $bodyText = $_.Exception.Message
    try { if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode; $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $bodyText = $reader.ReadToEnd(); $reader.Close() } } catch {}
    return [PSCustomObject]@{ SuksesHTTP = $false; TiketOk = $false; StatusCode = $code; ElapsedMs = [int]$sw.ElapsedMilliseconds; Body = $bodyText; Va = $vaNumber }
  }
}
function Tulis-Hasil-PayVa($label, $hasil) {
  $potong = $hasil.Body; if ($potong.Length -gt 400) { $potong = $potong.Substring(0,400) + "..." }
  Log "[$label] Hasil pay-va: HTTP Sukses=$($hasil.SuksesHTTP) TiketOk=$($hasil.TiketOk) HTTP=$($hasil.StatusCode) Elapsed=$($hasil.ElapsedMs) ms VA=$($hasil.Va)"
  Log "[$label] Body: $potong"
  Log "[$label] Circuit sesudah: $(Get-CircuitState)"
}
try {
  Log "`n--- 1. CEK 4 SERVICE ---"
  $cek1 = Check-Service "$BookingUrl/api/hiking-routes" "Booking 8001"
  $cek2 = Check-Service "$PaymentUrl/api/circuit/status" "Payment 8002"
  $cek3 = Check-Service "$TrackingUrl/api/tracking/sos" "Tracking 8003"
  $cek4 = Check-Service "$GateUrl/api/fault-inject/status" "Gate 8004"
  if (-not ($cek1 -and $cek2 -and $cek3 -and $cek4)) { Log "`n[STOP] Ada service tidak jalan."; exit 1 }
  Log "`n--- 2. TEST FAULT VIA API - PAKAI VA ASLI ---"
  Log "Retry: 3 attempt, jeda 1 detik. Timeout Gate per attempt 3 detik. Total maksimal sekitar 11 detik jika semua gagal."
  # 2a Latency pakai VA 8800000141
  Log "`n[2a] Fault latency, VA 8800000141 ..."
  Reset-Sesi-RM
  if (-not (Siapkan-VA-Asli 141 "8800000141")) { Log "[2a] SKIP, VA tidak bisa disiapkan"; } else {
    Log "[2a] Circuit sebelum: $(Get-CircuitState)"
    if (Set-Fault "latency") {
      $hasilLat = Invoke-PayVa "8800000141"
      Tulis-Hasil-PayVa "2a-latency" $hasilLat
      Log "[2a] Cara baca baru: Gate lambat, tiap attempt timeout 3 detik, retry 3x dengan jeda 1 detik. Jika TiketOk=true, retry menyelamatkan. Jika HTTP 503, berarti Fail Fast karena Circuit OPEN. Jika HTTP 502, berarti Gate gagal setelah 3 attempt."
    }
  }
  Set-Fault "clear" | Out-Null; Reset-Circuit | Out-Null; Start-Sleep -Seconds 2
  # 2b Error pakai VA 8800000142
  Log "`n[2b] Fault error, VA 8800000142 ..."
  Reset-Sesi-RM
  if (-not (Siapkan-VA-Asli 142 "8800000142")) { Log "[2b] SKIP, VA tidak bisa disiapkan"; } else {
    Log "[2b] Circuit sebelum: $(Get-CircuitState)"
    if (Set-Fault "error") {
      $hasilErr = Invoke-PayVa "8800000142"
      Tulis-Hasil-PayVa "2b-error" $hasilErr
      Log "[2b] Cara baca baru: Gate balas 500, retry 3x jeda 1 detik. Jika TiketOk=true, retry menyelamatkan. Jika HTTP 502 atau 503, berarti gagal setelah retry atau Fail Fast."
    }
  }
  Set-Fault "clear" | Out-Null; Reset-Circuit | Out-Null
  # Kembalikan 141 dan 142 ke PENDING supaya tidak mencemari pengujian JMeter berikutnya
  Jalankan-Mysql "USE payment_db; UPDATE payments SET status='PENDING' WHERE booking_id IN (141,142);"
  Jalankan-Mysql "USE ticket_db; DELETE FROM tickets WHERE booking_id IN (141,142);"
  Log "VA 8800000141 dan 8800000142 dikembalikan ke PENDING, tiketnya dihapus."
  Log "`n--- 3. JALANIN circuit:test UJI 0-5 ---"
  Log "Uji 0 = Retry murni simulasi (500,500,200). Uji 1-5 = CLOSED, OPEN, Fail Fast, HALF-OPEN pulih, HALF-OPEN gagal."
  if (Test-Path $JsonFile) { $backupJson = "$PaymentDir\storage\app\circuit_metrics-backup-$waktu.json"; Copy-Item $JsonFile $backupJson -Force; Log "[JSON] Backup JSON lama ke: $backupJson" }
  Set-Fault "clear" | Out-Null; Reset-Circuit | Out-Null
  Push-Location $PaymentDir
  try { Write-Host "`n--- output circuit:test (live) ---" -ForegroundColor Cyan; php artisan circuit:test | Tee-Object -Variable testOutput; $testOutput | Add-Content -Path $OutputFile -Encoding utf8; $kodeKeluar = $LASTEXITCODE; Log "`n[circuit:test] Exit code: $kodeKeluar" } finally { Pop-Location }
  try { Set-Location $LokasiAwal } catch {}
  Log "`n--- 3b. REKAP UJI 0-5 ---"
  if ($null -eq $testOutput -or $testOutput.Count -eq 0) { Log "[Rekap] TIDAK ADA OUTPUT dari circuit:test." } else {
    $jumlahPass = @($testOutput | Where-Object { $_ -match "HASIL: PASS" }).Count
    $jumlahFail = @($testOutput | Where-Object { $_ -match "HASIL: FAIL" }).Count
    $barisUji = @($testOutput | Where-Object { $_ -match "\[UJI [0-9]\]" })
    foreach ($b in $barisUji) { Log "[Rekap] $b" }
    Log "[Rekap] PASS: $jumlahPass | FAIL: $jumlahFail | Harapan: 6 PASS (Uji 0-5)"
  }
  Log "`n--- 4. SELESAI ---"
  Log "File hasil TXT: $OutputFile"
  Log "File JSON buat Bab 4: $JsonFile"
  Write-Host "`nSelesai! Cek file $OutputFile" -ForegroundColor Green
} finally { Set-Fault "clear" | Out-Null; Reset-Circuit | Out-Null; try { Set-Location $LokasiAwal } catch {} }
