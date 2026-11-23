<?php

namespace App\Services;

class RetryMechanism
{
    /**
     * Retry Mechanism —  max 3 attempt (atau 5 untuk Uji 2/5), jeda 5 detik.
     * FIX: $onRetry WAJIB dipanggil di SETIAP gagal, termasuk attempt terakhir.
     * Kalau cuma dipanggil saat masih mau retry, gagal terakhir tidak kehitung
     * ke Circuit Breaker, jadi 5 gagal kehitung cuma 4 -> Circuit tidak pernah OPEN.
     */
    public function execute(callable $callback, int $maxAttempts = 3, int $delay = 5, ?callable $onRetry = null): mixed
    {
        $lastError = null;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                return $callback($attempt);
            } catch (\Exception $e) {
                $lastError = $e;

                if ($onRetry) {
                    $onRetry($attempt, $e);
                }

                // Kalau masih ada sisa attempt, tunggu 5 detik lalu ulang
                if ($attempt < $maxAttempts) {
                    sleep($delay);
                    continue;
                }

                // Sudah habis, lempar error terakhir
                throw $lastError;
            }
        }

        throw $lastError;
    }
}
