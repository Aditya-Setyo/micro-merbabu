<?php

namespace App\Http\Controllers;

use App\Services\CircuitBreaker;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class CircuitBreakerController extends Controller
{
    public function status(): JsonResponse
    {
        // Coba dari Service dulu, kalau tidak ada method-nya, fallback ke Cache
        try {
            $cb = app(CircuitBreaker::class);
            $state = method_exists($cb, 'getState') ? $cb->getState() : Cache::get('circuit_breaker_gate_state', 'CLOSED');
            $failures = method_exists($cb, 'getFailureCount') ? $cb->getFailureCount() : (int) Cache::get('circuit_breaker_gate_failures', 0);
            $lastFailure = method_exists($cb, 'getLastFailureTime') ? $cb->getLastFailureTime() : Cache::get('circuit_breaker_gate_last_failure');
        } catch (\Throwable $e) {
            $state = Cache::get('circuit_breaker_gate_state', 'CLOSED');
            $failures = (int) Cache::get('circuit_breaker_gate_failures', 0);
            $lastFailure = Cache::get('circuit_breaker_gate_last_failure');
        }

        return response()->json([
            'service' => 'gate',
            'state' => $state,
            'failure_count' => $failures,
            'last_failure_at' => $lastFailure,
            'checked_at' => now()->toDateTimeString(),
        ]);
    }

    public function reset(): JsonResponse
    {
        try {
            $cb = app(CircuitBreaker::class);
            if (method_exists($cb, 'reset')) {
                $cb->reset();
            }
        } catch (\Throwable $e) {
            // fallback manual
        }

        Cache::put('circuit_breaker_gate_state', 'CLOSED', 3600);
        Cache::put('circuit_breaker_gate_failures', 0, 3600);
        Cache::forget('circuit_breaker_gate_last_failure');

        return response()->json([
            'service' => 'gate',
            'state' => 'CLOSED',
            'failure_count' => 0,
            'message' => 'Circuit Breaker di-reset ke CLOSED',
        ]);
    }
}
