<?php

use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Services\CircuitBreaker;

Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'service' => 'payment-service',
        'status' => 'running',
        'port' => 8002,
        'message' => 'Payment Service berhasil dijalankan.',
    ]);
});

// Tidak pakai auth:sanctum di sini, karena token divalidasi di booking-service
Route::prefix('payments')->group(function () {
    Route::post('/create', [PaymentController::class, 'createPayment']);
    Route::post('/send-otp', [PaymentController::class, 'sendOtp']);
    Route::post('/verify-otp', [PaymentController::class, 'verifyOtp']);
    Route::post('/pay-va', [PaymentController::class, 'payVa']);
});

Route::get('/circuit-breaker/status', function () {
    $cb = new CircuitBreaker('gate');
    return response()->json([
        'success' => true,
        'circuit_breaker' => $cb->getState(),
    ]);
});

Route::post('/circuit-breaker/reset', function () {
    $cb = new CircuitBreaker('gate');
    $cb->reset();
    return response()->json(['success' => true, 'message' => 'Circuit Breaker di-reset ke CLOSED']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
