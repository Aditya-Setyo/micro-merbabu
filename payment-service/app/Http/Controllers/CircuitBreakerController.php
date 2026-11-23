<?php

namespace App\Http\Controllers;

use App\Services\CircuitBreaker;
use Illuminate\Http\JsonResponse;

class CircuitBreakerController extends Controller
{
    public function status(): JsonResponse
    {
        $cb = new CircuitBreaker('gate');

        // getState() di CircuitBreaker.php balikin ARRAY, bukan string.
        // Jadi ambil field-nya satu-satu, jangan langsung dilempar.
        $state = $cb->getState();

        return response()->json([
            'service' => 'gate',
            'state' => $state['state'] ?? $cb->getStateName(),
            'failure_count' => $cb->getFailureCount(),
            'failure_rate' => round($cb->getFailureRate(), 1),
            'window' => $state['window'] ?? [],
            'open_until' => $state['open_until'] ?? null,
            'checked_at' => now()->toDateTimeString(),
        ]);
    }

    public function reset(): JsonResponse
    {
        $cb = new CircuitBreaker('gate');
        $cb->reset(); // Cache::forget('circuit_breaker_gate')

        return response()->json([
            'service' => 'gate',
            'state' => 'CLOSED',
            'failure_count' => 0,
            'failure_rate' => 0,
            'message' => 'Circuit Breaker di-reset ke CLOSED',
        ]);
    }
}
