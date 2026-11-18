
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\HikingRouteController;

// ========================================
// API PUBLIK
// ========================================

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/hiking-routes', [HikingRouteController::class, 'index']);
Route::get('/hiking-routes/{id}', [HikingRouteController::class, 'show']);
Route::get('/hiking-routes/{id}/quota', [HikingRouteController::class, 'quota']);

// ========================================
// API YANG MEMERLUKAN AUTENTIKASI
// ========================================

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::get('/profile', [AuthController::class, 'profile']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/bookings', [BookingController::class, 'index']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    
});
