<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\HikingRouteController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/hiking-routes', [HikingRouteController::class, 'index']);
Route::get('/hiking-routes/{id}', [HikingRouteController::class, 'show']);
Route::get('/hiking-routes/{id}/quota', [HikingRouteController::class, 'quota']);

// Internal untuk Tracking, tanpa auth
Route::get('/bookings/{id}/internal', [BookingController::class, 'showInternal']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::post('/bookings/lookup-members', [BookingController::class, 'lookupMembers']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
});
