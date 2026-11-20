<?php

use App\Http\Controllers\TicketController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FaultInjectionController;

Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'service' => 'gate-ticket-service',
        'status' => 'running',
        'port' => 8004,
    ]);
});

Route::prefix('tickets')->group(function () {
    // Dari Payment Service, tanpa auth user
    Route::post('/confirm', [TicketController::class, 'confirm']);

    // Untuk Petugas Basecamp, sesuai use case Validasi Tiket
    Route::post('/validate', [TicketController::class, 'validateTicket']);
    Route::post('/check-in', [TicketController::class, 'checkIn']);
    Route::post('/check-out', [TicketController::class, 'checkOut']);
});

Route::post('/fault-inject/enable', [FaultInjectionController::class, 'enable']);
Route::post('/fault-inject/disable', [FaultInjectionController::class, 'disable']);
Route::get('/fault-inject/status', [FaultInjectionController::class, 'status']);
