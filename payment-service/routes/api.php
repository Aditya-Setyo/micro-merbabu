<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;


Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'service' => 'payment-service',
        'status' => 'running',
        'port' => 8002,
        'message' => 'Payment Service berhasil dijalankan.',
    ]);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
