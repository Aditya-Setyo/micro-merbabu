<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\PaymentOtp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

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

        $request->validate([
            'booking_id' => 'required|integer',
        ]);

        $bookingId = $request->booking_id;
        $token = $request->header('Authorization');

        // Panggil endpoint booking yang SUDAH ADA, sambil teruskan token
        $bookingResponse = Http::withHeaders([
            'Authorization' => $token,
            'Accept' => 'application/json',
        ])->timeout(5)->get("http://127.0.0.1:8001/api/bookings/{$bookingId}");

        if ($bookingResponse->status() === 401) {
            return response()->json([
                'success' => false,
                'message' => 'Token tidak valid atau sudah kedaluwarsa. Silakan login ulang.'
            ], 401);
        }

        if ($bookingResponse->failed()) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data dari Booking Service atau Booking ID tidak ditemukan.'
            ], 404);
        }

        $bookingData = $bookingResponse->json()['data'] ?? $bookingResponse->json();

        if (isset($bookingData['status']) && $bookingData['status'] !== 'PENDING_PAYMENT') {
            return response()->json([
                'success' => false,
                'message' => "Booking tidak dalam status PENDING_PAYMENT (Status saat ini: {$bookingData['status']})."
            ], 400);
        }

        $totalAmount = $bookingData['total_amount'] ?? $bookingData['total_price'] ?? 0;

        $existingPayment = Payment::where('booking_id', $bookingId)->first();
        if ($existingPayment) {
            return response()->json([
                'success' => true,
                'message' => 'Tagihan pembayaran sudah ada.',
                'data' => $existingPayment
            ], 200);
        }

        $vaNumber = '8800' . str_pad($bookingId, 6, '0', STR_PAD_LEFT);

        $payment = Payment::create([
            'booking_id' => $bookingId,
            'va_number' => $vaNumber,
            'amount' => $totalAmount,
            'status' => 'PENDING',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tagihan pembayaran berhasil dibuat.',
            'data' => $payment
        ], 201);
    }

    public function sendOtp(Request $request)
    {
        if ($check = $this->checkToken($request)) {
            return $check;
        }

        $request->validate([
            'payment_id' => 'required|exists:payments,id',
            'email' => 'required|email',
        ]);

        $otpCode = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = Carbon::now()->addMinutes(5);

        $otp = PaymentOtp::create([
            'payment_id' => $request->payment_id,
            'email' => $request->email,
            'otp_code' => $otpCode,
            'is_verified' => false,
            'expires_at' => $expiresAt,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Kode OTP berhasil dikirim ke email.',
            'data' => [
                'payment_id' => $otp->payment_id,
                'email' => $otp->email,
                'otp_code_testing' => $otpCode,
                'expires_at' => $expiresAt->toDateTimeString(),
            ]
        ], 200);
    }

    public function verifyOtp(Request $request)
    {
        if ($check = $this->checkToken($request)) {
            return $check;
        }

        $request->validate([
            'payment_id' => 'required|exists:payments,id',
            'otp_code' => 'required|string|size:6',
        ]);

        $otp = PaymentOtp::where('payment_id', $request->payment_id)
            ->where('otp_code', $request->otp_code)
            ->where('is_verified', false)
            ->where('expires_at', '>', Carbon::now())
            ->first();

        if (!$otp) {
            return response()->json([
                'success' => false,
                'message' => 'Kode OTP tidak valid atau sudah kedaluwarsa.'
            ], 400);
        }

        $otp->update(['is_verified' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Verifikasi OTP berhasil.'
        ], 200);
    }

    public function payVa(Request $request)
    {
        if ($check = $this->checkToken($request)) {
            return $check;
        }

        $request->validate([
            'va_number' => 'required|string',
            'amount' => 'required|numeric',
        ]);

        $payment = Payment::where('va_number', $request->va_number)->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Nomor Virtual Account tidak ditemukan.'
            ], 404);
        }

        if ($payment->status === 'SUCCESS') {
            return response()->json([
                'success' => false,
                'message' => 'Pembayaran untuk VA ini sudah berhasil sebelumnya.'
            ], 400);
        }

        if ($payment->amount != $request->amount) {
            return response()->json([
                'success' => false,
                'message' => "Nominal pembayaran tidak sesuai. Tagihan: {$payment->amount}"
            ], 400);
        }

        $verifiedOtp = PaymentOtp::where('payment_id', $payment->id)
            ->where('is_verified', true)
            ->first();

        if (!$verifiedOtp) {
            return response()->json([
                'success' => false,
                'message' => 'Pembayaran ditolak: OTP belum diverifikasi.'
            ], 403);
        }

        $payment->update(['status' => 'SUCCESS']);

        $gateUrl = "http://127.0.0.1:8004/api/tickets/confirm";
        $gateResponse = Http::post($gateUrl, [
            'booking_id' => $payment->booking_id,
            'payment_id' => $payment->id,
            'status' => 'PAID',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pembayaran Virtual Account berhasil diproses.',
            'payment_details' => $payment,
            'gate_service_response' => $gateResponse->json() ?? $gateResponse->body()
        ], 200);
    }
}
