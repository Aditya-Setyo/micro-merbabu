<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TrackingController;

Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'service' => 'tracking-service',
        'status' => 'running',
        'port' => 8003,
    ]);
});

Route::prefix('tracking')->group(function () {
    Route::post('/check-in', [TrackingController::class, 'checkIn']);
    Route::post('/check-out', [TrackingController::class, 'checkOut']);
    Route::post('/location', [TrackingController::class, 'updateLocation']);
    Route::post('/sos', [TrackingController::class, 'sendSos']);
    Route::get('/status/{ticketCode}', [TrackingController::class, 'getStatus']);
    Route::get('/sos', [TrackingController::class, 'getSosList']);
});
