<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class CircuitBreaker
{
    protected string $key;
    protected int $windowSize = 10; // sliding window 10 requests
    protected int $failureThreshold = 5; // 50% dari 10 = 5 gagal
    protected int $resetTimeout = 30; // OPEN 30 detik

    public function __construct(string $key = 'gate')
    {
        $this->key = 'circuit_breaker_' . $key;
    }

    public function getState(): array
    {
        return Cache::get($this->key, [
            'state' => 'CLOSED',
            'window' => [], // Isi: array true = sukses, false = gagal, maks 10 terakhir
            'open_until' => null,
        ]);
    }

    public function getStateName(): string
    {
        return $this->getState()['state'];
    }

    public function getFailureCount(): int
    {
        $window = $this->getState()['window'] ?? [];
        return count(array_filter($window, fn($v) => $v === false));
    }

    public function getFailureRate(): float
    {
        $window = $this->getState()['window'] ?? [];
        if (count($window) === 0) return 0;
        return $this->getFailureCount() / count($window) * 100;
    }

    public function canAttempt(): bool
    {
        $state = $this->getState();

        if ($state['state'] === 'CLOSED') return true;

        if ($state['state'] === 'OPEN') {
            if ($state['open_until'] && Carbon::now()->greaterThanOrEqualTo(Carbon::parse($state['open_until']))) {
                $this->setState('HALF_OPEN', $state['window'] ?? []);
                return true;
            }
            return false;
        }

        return true; // HALF_OPEN boleh 1 probe
    }

    public function recordSuccess(): void
    {
        $state = $this->getState();
        $window = $state['window'] ?? [];
        $window[] = true;
        $window = array_slice($window, -$this->windowSize);

        // HALF_OPEN sukses -> CLOSED, window di-reset
        if ($state['state'] === 'HALF_OPEN') {
            $this->setState('CLOSED', []);
            return;
        }

        $this->saveWindow($window, 'CLOSED');
    }

    public function recordFailure(): void
    {
        $state = $this->getState();
        $window = $state['window'] ?? [];
        $window[] = false;
        $window = array_slice($window, -$this->windowSize);
        $failures = count(array_filter($window, fn($v) => $v === false));

        // HALF_OPEN gagal -> langsung OPEN lagi
        if ($state['state'] === 'HALF_OPEN') {
            $this->setState('OPEN', $window);
            return;
        }

        if ($failures >= $this->failureThreshold) {
            $this->setState('OPEN', $window);
        } else {
            $this->saveWindow($window, 'CLOSED');
        }
    }

    protected function setState(string $state, array $window): void
    {
        $openUntil = null;
        if ($state === 'OPEN') {
            $openUntil = Carbon::now()->addSeconds($this->resetTimeout)->toDateTimeString();
        }
        Cache::put($this->key, [
            'state' => $state,
            'window' => $window,
            'open_until' => $openUntil,
        ], 3600);
    }

    protected function saveWindow(array $window, string $state): void
    {
        Cache::put($this->key, [
            'state' => $state,
            'window' => $window,
            'open_until' => null,
        ], 3600);
    }

    public function reset(): void
    {
        Cache::forget($this->key);
    }
}