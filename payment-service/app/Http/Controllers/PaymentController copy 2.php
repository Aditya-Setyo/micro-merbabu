<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\PaymentOtp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;
use App\Services\CircuitBreaker;
use App\Services\RetryMechanism;
use Exception;

class PaymentController extends Controller
{
    private function checkToken(Request $request)
    {
        if (!$request->header('Authorization')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Silakan login dulu.'
            ], 401);
        }
        return null;
    }

    public function createPayment(Request $request)
    {
        if ($check = $this->checkToken($request)) {
            return $check;
        }
        $request->validate(['booking_id' => 'required|integer']);
        $bookingId = $request->booking_id;
        $token = $request->header('Authorization');
        $bookingResponse = Http::withHeaders([
            'Authorization' => $token,
            'Accept' => 'application/json',
        ])->timeout(5)->get("http://127.0.0.1:8001/api/bookings/{$bookingId}");
        if ($bookingResponse->status() === 401) {
            return response()->json(['success' => false, 'message' => 'Token tidak valid atau sudah kedaluwarsa. Silakan login ulang.'], 401);
        }
        if ($bookingResponse->failed()) {
            return response()->json(['success' => false, 'message' => 'Gagal mengambil data dari Booking Service atau Booking ID tidak ditemukan.'], 404);
        }
        $bookingData = $bookingResponse->json()['data'] ?? $bookingResponse->json();
        if (isset($bookingData['status']) && $bookingData['status'] !== 'PENDING_PAYMENT') {
            return response()->json(['success' => false, 'message' => "Booking tidak dalam status PENDING_PAYMENT (Status saat ini: {$bookingData['status']})."], 400);
        }
        $totalAmount = $bookingData['total_amount'] ?? $bookingData['total_price'] ?? 0;
        $existingPayment = Payment::where('booking_id', $bookingId)->first();
        if ($existingPayment) {
            return response()->json(['success' => true, 'message' => 'Tagihan pembayaran sudah ada.', 'data' => $existingPayment], 200);
        }
        $vaNumber = '8800' . str_pad($bookingId, 6, '0', STR_PAD_LEFT);
        $payment = Payment::create(['booking_id' => $bookingId, 'va_number' => $vaNumber, 'amount' => $totalAmount, 'status' => 'PENDING']);
        return response()->json(['success' => true, 'message' => 'Tagihan pembayaran berhasil dibuat.', 'data' => $payment], 201);
    }

    public function sendOtp(Request $request)
    {
        if ($check = $this->checkToken($request)) { return $check; }
        $request->validate(['payment_id' => 'required|exists:payments,id', 'email' => 'required|email']);
        $otpCode = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = Carbon::now()->addMinutes(5);
        $otp = PaymentOtp::create(['payment_id' => $request->payment_id, 'email' => $request->email, 'otp_code' => $otpCode, 'is_verified' => false, 'expires_at' => $expiresAt]);
        return response()->json(['success' => true, 'message' => 'Kode OTP berhasil dikirim ke email.', 'data' => ['payment_id' => $otp->payment_id, 'email' => $otp->email, 'otp_code_testing' => $otpCode, 'expires_at' => $expiresAt->toDateTimeString()]], 200);
    }

    public function verifyOtp(Request $request)
    {
        if ($check = $this->checkToken($request)) { return $check; }
        $request->validate(['payment_id' => 'required|exists:payments,id', 'otp_code' => 'required|string|size:6']);
        $otp = PaymentOtp::where('payment_id', $request->payment_id)->where('otp_code', $request->otp_code)->where('is_verified', false)->where('expires_at', '>', Carbon::now())->first();
        if (!$otp) { return response()->json(['success' => false, 'message' => 'Kode OTP tidak valid atau sudah kedaluwarsa.'], 400); }
        $otp->update(['is_verified' => true]);
        return response()->json(['success' => true, 'message' => 'Verifikasi OTP berhasil.'], 200);
    }

    public function payVa(Request $request)
    {
        $request->validate(['va_number' => 'required|string']);
        $payment = Payment::where('va_number', $request->va_number)->first();
        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Payment tidak ditemukan.'], 404);
        }

        $circuit = new CircuitBreaker('gate');
        $retry = new RetryMechanism();

        // Fail Fast: Circuit OPEN -> 503, tanpa panggil Gate, tanpa retry, payment tetap PENDING
        if (!$circuit->canAttempt()) {
            return response()->json([
                'success' => false,
                'message' => 'Gate Service sedang OPEN (Fail Fast). Pembayaran tidak diproses.',
                'payment_details' => $payment,
                'circuit_breaker' => ['state' => 'OPEN', 'message' => 'HTTP 503 Fail Fast'],
                'gate_service_response' => null,
            ], 503);
        }

        $isHalfOpen = $circuit->getStateName() === 'HALF_OPEN';
        $maxAttempts = $isHalfOpen ? 1 : 3;
        $gateUrl = "http://127.0.0.1:8004/api/tickets/confirm";
        $gateData = null;
        $lastError = null;
        $attemptsUsed = 0;

        try {
            $gateData = $retry->execute(
                function ($attempt) use ($gateUrl, $payment, &$attemptsUsed) {
                    $attemptsUsed = $attempt;
                    $gateResponse = Http::timeout(3)->post($gateUrl, [
                        'booking_id' => $payment->booking_id,
                        'payment_id' => $payment->id,
                        'status' => 'PAID',
                    ]);
                    if ($gateResponse->successful()) {
                        return $gateResponse->json() ?? $gateResponse->body();
                    }
                    throw new Exception('Gate balas HTTP ' . $gateResponse->status());
                },
                $maxAttempts,
                1,
                function ($attempt, $e) use ($circuit) {
                    $circuit->recordFailure();
                }
            );
            $circuit->recordSuccess();
        } catch (Exception $e) {
            $lastError = $e->getMessage();
        }

        // Gate gagal setelah semua retry -> 502, payment tetap PENDING agar bisa diulang di run berikutnya
        if ($gateData === null) {
            return response()->json([
                'success' => false,
                'message' => 'Konfirmasi tiket gagal setelah ' . $maxAttempts . ' percobaan.',
                'payment_details' => $payment,
                'circuit_breaker' => ['state' => $circuit->getStateName(), 'attempts' => $maxAttempts, 'last_error' => $lastError],
                'gate_service_response' => ['success' => false, 'message' => 'Gate Service tidak dapat dihubungi: ' . $lastError],
            ], 502);
        }

        // Gate berhasil -> baru ubah payment ke SUCCESS
        if ($payment->status !== 'SUCCESS') {
            $payment->update(['status' => 'SUCCESS']);
        }
        $payment->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Pembayaran Virtual Account berhasil diproses.',
            'payment_details' => $payment,
            'circuit_breaker' => ['state' => $circuit->getStateName(), 'attempts' => $attemptsUsed],
            'gate_service_response' => $gateData,
        ], 200);
    }

    // ================= BASELINE: pay-va-baseline 1x tanpa Retry, tanpa Circuit Breaker =================
    // PERBAIKAN UTAMA:
    // 1. JANGAN ubah payment ke SUCCESS sebelum Gate berhasil.
    // 2. Panggil Gate 1x saja, timeout 3 detik.
    // 3. Jika Gate balas 500 atau timeout, kembalikan HTTP 502, payment tetap PENDING.
    // 4. Jika Gate berhasil, baru ubah payment ke SUCCESS dan kembalikan 200.
    // Catatan: Http::post di Laravel TIDAK throw saat Gate balas 500, jadi harus cek $gateResponse->failed().
    public function payVaBaseline(Request $request)
    {
        $va = $request->input('va_number') ?? $request->input('virtual_account');
        $payment = Payment::where('va_number', $va)->first();
        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Payment tidak ditemukan.'], 404);
        }

        try {
            $gateResponse = Http::timeout(3)->post("http://127.0.0.1:8004/api/tickets/confirm", [
                'booking_id' => $payment->booking_id,
                'payment_id' => $payment->id,
                'status' => 'PAID',
            ]);

            // Gate balas 500 atau 4xx -> dianggap gagal, 502, payment tetap PENDING
            if ($gateResponse->failed()) {
                return response()->json([
                    'success' => false,
                    'message' => '[Baseline] Gate gagal (tanpa retry). Pembayaran tidak diproses.',
                    'payment_id' => $payment->id,
                    'payment_status' => $payment->status,
                    'gate_service_response' => $gateResponse->json() ?? ['success' => false, 'message' => 'Gate balas HTTP ' . $gateResponse->status()],
                ], 502);
            }

            // Gate berhasil -> baru ubah ke SUCCESS
            if ($payment->status !== 'SUCCESS') {
                $payment->update(['status' => 'SUCCESS']);
            }
            $payment->refresh();

            return response()->json([
                'success' => true,
                'message' => '[Baseline] OK',
                'payment_id' => $payment->id,
                'payment_status' => $payment->status,
                'gate_service_response' => $gateResponse->json() ?? $gateResponse->body(),
            ], 200);

        } catch (\Throwable $e) {
            // Timeout koneksi atau Gate mati -> 502, payment tetap PENDING
            return response()->json([
                'success' => false,
                'message' => '[Baseline] Gate gagal (tanpa retry): ' . $e->getMessage(),
                'payment_id' => $payment->id,
                'payment_status' => $payment->status,
                'gate_service_response' => ['success' => false, 'message' => $e->getMessage()],
            ], 502);
        }
    }
}
