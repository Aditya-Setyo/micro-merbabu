# test-rm-cb-otomatis.ps1
# Tinggal run: .\test-rm-cb-otomatis.ps1
# Dia yang jalanin: Fault Injection via API + circuit:test Uji 1-5 otomatis

$PaymentDir = "D:\Skripsi\BTN Gunung Merbabu\micro-merbabu\payment-service"
$GateUrl = "http://127.0.0.1:8004"
$PaymentUrl = "http://127.0.0.1:8002"
$OutputFile = "D:\Skripsi\BTN Gunung Merbabu\micro-merbabu\hasil-circuit-3orang.txt"

Write-Host "=== TEST RM + CB OTOMATIS - TINGGAL RUN ===" -ForegroundColor Cyan
"=== TEST RM + CB OTOMATIS - $(Get-Date) ===" | Out-File $OutputFile -Encoding utf8

function Log($msg) {
    Write-Host $msg
    Add-Content $OutputFile $msg
}

function Set-Fault($type) {
    # Pakai FaultInjectionController, bukan tinker lagi
    if ($type -eq "clear") {
        try {
            $r = Invoke-RestMethod -Uri "$GateUrl/api/fault-inject/disable" -Method Post -TimeoutSec 5
            Log "[Fault] Dimatikan - Gate normal"
        } catch { Log "[Fault] Gagal matikan: $($_.Exception.Message)" }
    } else {
        try {
            $body = @{ type = $type } | ConvertTo-Json
            $r = Invoke-RestMethod -Uri "$GateUrl/api/fault-inject/enable" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5
            Log "[Fault] Diaktifkan: $type"
        } catch { Log "[Fault] Gagal aktifkan $type : $($_.Exception.Message)" }
    }
    try {
        $s = Invoke-RestMethod -Uri "$GateUrl/api/fault-inject/status" -Method Get -TimeoutSec 5
        Log "[Fault] Status sekarang: $($s.fault_injection)"
    } catch {}
}

function Check-Service($url, $name) {
    try {
        $r = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 3
        Log "[Cek] $name jalan - $url"
        return $true
    } catch {
        Log "[Cek] $name TIDAK JALAN - $url - $($_.Exception.Message)"
        return $false
    }
}

# --- 1. CEK SERVICE ---
Log "`n--- 1. CEK 4 SERVICE ---"
Check-Service "http://127.0.0.1:8001/api/hiking-routes" "Booking 8001"
Check-Service "http://127.0.0.1:8002/api/circuit/status" "Payment 8002"
Check-Service "http://127.0.0.1:8003/api/tracking/sos" "Tracking 8003"
Check-Service "http://127.0.0.1:8004/api/fault-inject/status" "Gate 8004"

# --- 2. TEST FAULT INJECTION VIA API ---
Log "`n--- 2. TEST FAULT INJECTION VIA API (Gate asli) ---"
Log "Ini buat Uji 9 RM pakai Gate asli, bukan Gate mati."
Set-Fault "latency"
Log "Kalau sekarang kamu pay-va, harusnya tetap SUCCESS tapi retry, karena Gate lambat 5 detik."
Start-Sleep -Seconds 2
Set-Fault "error"
Log "Kalau sekarang kamu pay-va, harusnya retry 3x lalu gagal, karena Gate balas 500."
Start-Sleep -Seconds 2
Set-Fault "clear"
Log "Fault sudah dimatikan, Gate balik normal."

# --- 3. TEST RM + CB OTOMATIS UJI 1-5 ---
Log "`n--- 3. JALANIN circuit:test UJI 1-5 OTOMATIS ---"
Log "Ini yang sudah ada countdown 30 detik + sleep 5 detik otomatis di dalamnya."
Log "Ditungguin saja, sekitar 2-3 menit, jangan di-close..."
Set-Location $PaymentDir
# Jalankan circuit:test, output langsung ke layar + ke file
php artisan circuit:test | Tee-Object -Variable testOutput | Add-Content $OutputFile

Log "`n--- 4. SELESAI ---"
Log "File hasil TXT: $OutputFile"
Log "File JSON buat Bab 4: $PaymentDir\storage\app\circuit_metrics.json"
Log "Cek di atas: Uji 1-5 harus PASS semua."

Write-Host "`nSelesai! Cek file hasil-circuit-3orang.txt" -ForegroundColor Green