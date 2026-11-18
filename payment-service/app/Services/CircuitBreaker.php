<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class CircuitBreaker
{
    protected string $key;
    protected int $failureThreshold = 3; // sesuai diagram: maksimal 3 kegagalan
    protected int $resetTimeout = 30; // 30 detik untuk test HALF-OPEN, biar tidak kelamaan nunggu

    public function __construct(string $key = 'gate')
    {
        $this->key = 'circuit_breaker_' . $key;
    }

    public function getState(): array
    {
        return Cache::get($this->key, [
            'state' => 'CLOSED',
            'failures' => 0,
            'open_until' => null,
        ]);
    }

    public function getStateName(): string
    {
        return $this->getState()['state'];
    }

    // Cek boleh request atau harus Fail Fast
    public function canAttempt(): bool
    {
        $state = $this->getState();

        if ($state['state'] === 'CLOSED') {
            return true;
        }

        if ($state['state'] === 'OPEN') {
            // Kalau sudah lewat waktu tunggu, ubah jadi HALF-OPEN dan boleh test 1 request
            if ($state['open_until'] && Carbon::now()->greaterThanOrEqualTo(Carbon::parse($state['open_until']))) {
                $this->setState('HALF_OPEN', $state['failures']);
                return true;
            }
            // Masih OPEN, harus Fail Fast
            return false;
        }

        // HALF_OPEN boleh 1 request pengujian
        return true;
    }

    public function recordSuccess(): void
    {
        // HALF_OPEN yang sukses jadi CLOSED, sesuai diagram
        $this->setState('CLOSED', 0);
    }

    public function recordFailure(): void
    {
        $state = $this->getState();
        $failures = $state['failures'] + 1;

        // Kalau HALF_OPEN gagal, langsung balik OPEN
        if ($state['state'] === 'HALF_OPEN') {
            $this->setState('OPEN', $failures);
            return;
        }

        // Kalau sudah 3 kegagalan berturut-turut, ubah jadi OPEN
        if ($failures >= $this->failureThreshold) {
            $this->setState('OPEN', $failures);
        } else {
            $this->setState('CLOSED', $failures);
        }
    }

    protected function setState(string $state, int $failures): void
    {
        $openUntil = null;
        if ($state === 'OPEN') {
            $openUntil = Carbon::now()->addSeconds($this->resetTimeout)->toDateTimeString();
        }

        Cache::put($this->key, [
            'state' => $state,
            'failures' => $failures,
            'open_until' => $openUntil,
        ], 3600);
    }

    public function reset(): void
    {
        Cache::forget($this->key);
    }
}