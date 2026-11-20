<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\CircuitBreaker;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class TestCircuitBreaker extends Command
{
    protected $signature = 'circuit:test';
    protected $description = 'Test otomatis Retry + Circuit Breaker Uji 1-5 + Metrik Bab 3';

    protected CircuitBreaker $circuit;
    protected string $gateUpUrl = 'http://127.0.0.1:8004/api/tickets/confirm';
    protected string $gateDownUrl = 'http://127.0.0.1:8999/api/tickets/confirm';

    // Metrik yang diamati sesuai Bab 3.5 skripsi
    protected int $totalRequests = 0;
    protected int $successRequests = 0;
    protected int $failedRequests = 0;
    protected array $responseTimes = []; // dalam ms
    protected int $retryCount = 0;
    protected int $retrySuccessCount = 0;
    protected int $rejectedRequests = 0; // Fail Fast 503
    protected array $httpStatus = ['200' => 0, '201' => 0, '500' => 0, '503' => 0, 'other' => 0];
    protected array $stateTransitions = [];
    protected ?float $openStartTime = null;
    protected ?float $recoveryTime = null;

    public function handle()
    {
        $this->info('=== TEST OTOMATIS RETRY + CIRCUIT BREAKER ===');
        $this->info('Parameter sesuai Bab 3: Retry 3x jeda 5 detik, CB Window 10 Threshold 50% (5 gagal), OPEN 30 detik');
        $this->line('');

        $this->circuit = new CircuitBreaker('gate');
        $this->circuit->reset();
        $testStart = microtime(true);

        // Uji 1
        $this->info('[UJI 1] Gate jalan, Circuit CLOSED');
        $this->circuit->reset();
        $result = $this->callGate($this->gateUpUrl, 3, 'UJI 1');
        $this->recordTransition('UJI 1', $this->circuit->getStateName());
        $this->info($result ? '  -> PASS: State = CLOSED' : '  -> FAIL');
        $this->line('');

        // Uji 2 - butuh 5 gagal biar OPEN sesuai sliding window
        $this->info('[UJI 2] Gate mati, Retry sampai 5 gagal lalu OPEN');
        $this->circuit->reset();
        $result = $this->callGate($this->gateDownUrl, 5, 'UJI 2');
        $this->openStartTime = microtime(true);
        $this->recordTransition('UJI 2', $this->circuit->getStateName());
        $this->info(!$result && $this->circuit->getStateName() === 'OPEN' ? '  -> PASS: State = OPEN' : '  -> FAIL');
        $this->line('');

        // Uji 3 - Fail Fast
        $this->info('[UJI 3] Fail Fast 503 saat OPEN');
        $start = microtime(true);
        $canAttempt = $this->circuit->canAttempt();
        $duration = round((microtime(true) - $start) * 1000, 2);
        if (!$canAttempt) {
            $this->rejectedRequests++;
            $this->totalRequests++;
            $this->httpStatus['503']++;
            $this->responseTimes[] = $duration;
            $this->info('  -> PASS: Ditolak dalam ' . $duration . ' ms tanpa retry, HTTP 503');
        } else {
            $this->error('  -> FAIL: Seharusnya Fail Fast');
        }
        $this->recordTransition('UJI 3', $this->circuit->getStateName());
        $this->line('');

        // Uji 4
        $this->info('[UJI 4] HALF-OPEN -> CLOSED (Gate pulih)');
        $this->info('  Tunggu 30 detik untuk masuk HALF-OPEN...');
        $this->countdown(30);
        $this->circuit->canAttempt();
        $this->info('  State setelah 30 detik: ' . $this->circuit->getStateName());
        $result = $this->callGate($this->gateUpUrl, 1, 'UJI 4');
        if ($result) {
            $this->recoveryTime = microtime(true) - $this->openStartTime;
        }
        $this->recordTransition('UJI 4', $this->circuit->getStateName());
        $this->info($result && $this->circuit->getStateName() === 'CLOSED' ? '  -> PASS: Balik CLOSED' : '  -> FAIL');
        $this->line('');

        // Uji 5
        $this->info('[UJI 5] HALF-OPEN -> OPEN lagi (Gate masih mati)');
        $this->circuit->reset();
        $this->callGate($this->gateDownUrl, 5, 'UJI 5 - Bikin OPEN');
        $this->openStartTime = microtime(true);
        $this->info('  Sudah OPEN lagi, tunggu 30 detik untuk HALF-OPEN...');
        $this->countdown(30);
        $this->circuit->canAttempt();
        $this->info('  State sekarang: ' . $this->circuit->getStateName());
        $result = $this->callGate($this->gateDownUrl, 1, 'UJI 5 - Probe');
        $this->recordTransition('UJI 5', $this->circuit->getStateName());
        $this->info(!$result && $this->circuit->getStateName() === 'OPEN' ? '  -> PASS: Balik OPEN + 503' : '  -> FAIL');
        $this->line('');

        $totalDuration = microtime(true) - $testStart;
        $this->printFinalMetrics($totalDuration);
        $this->saveMetricsToFile($totalDuration);

        return 0;
    }

    protected function callGate(string $url, int $maxAttempts, string $label): bool
    {
        $hadRetry = false;
        for ($i = 1; $i <= $maxAttempts; $i++) {
            $start = microtime(true);
            $this->totalRequests++;
            try {
                $response = Http::timeout(3)->post($url, [
                    'booking_id' => 0,
                    'payment_id' => 0,
                    'status' => 'TEST',
                ]);
                $durationMs = round((microtime(true) - $start) * 1000, 2);
                $this->responseTimes[] = $durationMs;
                $status = (string) $response->status();
                $this->httpStatus[$status] = ($this->httpStatus[$status] ?? 0) + 1;
                if (!isset($this->httpStatus['200']) && !isset($this->httpStatus['201'])) {
                    // jaga agar key 200/201 tetap ada
                }
                // Status 2xx dianggap sukses, 4xx juga Gate hidup
                if ($response->status() >= 200 && $response->status() < 500) {
                    $this->successRequests++;
                    if ($hadRetry) $this->retrySuccessCount++;
                    $this->circuit->recordSuccess();
                    $this->line('    Percobaan ke-' . $i . ': SUKSES - HTTP ' . $status . ' - ' . $durationMs . ' ms');
                    return true;
                }
                throw new \Exception('Gate balas HTTP ' . $status);
            } catch (\Exception $e) {
                $durationMs = round((microtime(true) - $start) * 1000, 2);
                $this->responseTimes[] = $durationMs;
                $this->failedRequests++;
                // Kalau gagal karena koneksi, hitung sebagai 500 untuk distribusi
                if (str_contains($e->getMessage(), 'Failed to connect') || str_contains($e->getMessage(), 'Connection')) {
                    $this->httpStatus['500']++;
                }
                $this->circuit->recordFailure();
                $this->line('    Percobaan ke-' . $i . ': GAGAL - ' . $durationMs . ' ms - ' . substr($e->getMessage(), 0, 60));
                if ($i < $maxAttempts) {
                    $this->retryCount++;
                    $hadRetry = true;
                    sleep(5); // Sesuai skripsi: jeda 5 detik
                    continue;
                }
            }
        }
        return false;
    }

    protected function recordTransition(string $uji, string $state): void
    {
        $this->stateTransitions[] = $uji . ' -> ' . $state . ' (FailureRate: ' . round($this->circuit->getFailureRate(), 1) . '%)';
    }

    protected function countdown(int $seconds): void
    {
        for ($i = $seconds; $i > 0; $i--) {
            $this->output->write("\r    Menunggu... " . $i . ' detik ');
            sleep(1);
        }
        $this->output->write("\r    Menunggu... selesai          \n");
    }

    protected function printFinalMetrics(float $totalDuration): void
    {
        $total = $this->totalRequests > 0 ? $this->totalRequests : 1;
        $successRate = round($this->successRequests / $total * 100, 2);
        $failureRate = round($this->failedRequests / $total * 100, 2);
        $rejectionRate = round($this->rejectedRequests / $total * 100, 2);
        $avg = count($this->responseTimes) > 0 ? round(array_sum($this->responseTimes) / count($this->responseTimes), 2) : 0;
        $min = count($this->responseTimes) > 0 ? round(min($this->responseTimes), 2) : 0;
        $max = count($this->responseTimes) > 0 ? round(max($this->responseTimes), 2) : 0;
        $median = $this->median($this->responseTimes);
        $p95 = $this->percentile($this->responseTimes, 95);
        $throughput = $totalDuration > 0 ? round($total / $totalDuration, 2) : 0;
        $retrySuccessRate = $this->retryCount > 0 ? round($this->retrySuccessCount / $this->retryCount * 100, 2) : 0;
        $recovery = $this->recoveryTime !== null ? round($this->recoveryTime, 2) . ' detik' : 'Belum pulih / -';

        $this->info('==================================================');
        $this->info('HASIL AKHIR - PARAMETER');
        $this->info('==================================================');
        $this->line('Total Requests          : ' . $this->totalRequests);
        $this->line('Total Durasi Test       : ' . round($totalDuration, 2) . ' detik');
        $this->line('');
        $this->line('Success Rate            : ' . $successRate . '% (' . $this->successRequests . ' sukses dari ' . $this->totalRequests . ')');
        $this->line('Failure Rate            : ' . $failureRate . '% (' . $this->failedRequests . ' gagal)');
        $this->line('Average Response Time   : ' . $avg . ' ms');
        $this->line('Min Response Time       : ' . $min . ' ms');
        $this->line('Max Response Time       : ' . $max . ' ms');
        $this->line('Median (P50)            : ' . $median . ' ms');
        $this->line('P95 Response Time       : ' . $p95 . ' ms');
        $this->line('Throughput              : ' . $throughput . ' req/detik');
        $this->line('');
        $this->line('Retry Count             : ' . $this->retryCount . ' kali percobaan ulang');
        $this->line('Retry Success Rate      : ' . $retrySuccessRate . '%');
        $this->line('Circuit Breaker State   : ' . $this->circuit->getStateName());
        $this->line('Failure Rate Window     : ' . round($this->circuit->getFailureRate(), 1) . '% (Window 10, Threshold 50%)');
        $this->line('Rejection Rate (503)    : ' . $rejectionRate . '% (' . $this->rejectedRequests . ' ditolak Fail Fast)');
        $this->line('Recovery Time           : ' . $recovery . ' (OPEN -> CLOSED)');
        $this->line('');
        $this->line('HTTP Status Distribution:');
        $this->line('  200/201 (OK)          : ' . (($this->httpStatus['200'] ?? 0) + ($this->httpStatus['201'] ?? 0)));
        $this->line('  500 (Internal Error)   : ' . ($this->httpStatus['500'] ?? 0));
        $this->line('  503 (Fail Fast)        : ' . ($this->httpStatus['503'] ?? 0));
        $this->line('');
        $this->line('Transisi Circuit Breaker:');
        foreach ($this->stateTransitions as $t) {
            $this->line('  - ' . $t);
        }
        $this->info('==================================================');
    }

    protected function saveMetricsToFile(float $totalDuration): void
    {
        $total = $this->totalRequests > 0 ? $this->totalRequests : 1;
        $data = [
            'timestamp' => now()->toDateTimeString(),
            'total_requests' => $this->totalRequests,
            'total_duration_sec' => round($totalDuration, 2),
            'success_rate' => round($this->successRequests / $total * 100, 2),
            'failure_rate' => round($this->failedRequests / $total * 100, 2),
            'avg_response_time_ms' => count($this->responseTimes) > 0 ? round(array_sum($this->responseTimes) / count($this->responseTimes), 2) : 0,
            'min_response_time_ms' => count($this->responseTimes) > 0 ? round(min($this->responseTimes), 2) : 0,
            'max_response_time_ms' => count($this->responseTimes) > 0 ? round(max($this->responseTimes), 2) : 0,
            'median_ms' => $this->median($this->responseTimes),
            'p95_ms' => $this->percentile($this->responseTimes, 95),
            'throughput_req_per_sec' => $totalDuration > 0 ? round($total / $totalDuration, 2) : 0,
            'retry_count' => $this->retryCount,
            'retry_success_rate' => $this->retryCount > 0 ? round($this->retrySuccessCount / $this->retryCount * 100, 2) : 0,
            'circuit_state' => $this->circuit->getStateName(),
            'failure_rate_window' => round($this->circuit->getFailureRate(), 1),
            'rejection_rate' => round($this->rejectedRequests / $total * 100, 2),
            'recovery_time_sec' => $this->recoveryTime !== null ? round($this->recoveryTime, 2) : null,
            'http_status_distribution' => $this->httpStatus,
            'state_transitions' => $this->stateTransitions,
        ];
        Storage::put('circuit_metrics.json', json_encode($data, JSON_PRETTY_PRINT));
        $this->info('Metrik disimpan ke: storage/app/circuit_metrics.json (buat Bab 4)');
    }

    protected function median(array $arr): float
    {
        if (count($arr) === 0) return 0;
        sort($arr);
        $mid = (int) floor(count($arr) / 2);
        return count($arr) % 2
            ? round((float) $arr[$mid], 2)
            : round(((float) $arr[$mid - 1] + (float) $arr[$mid]) / 2, 2);
    }

    protected function percentile(array $arr, int $p): float
    {
        if (count($arr) === 0) return 0;
        sort($arr);
        $index = (int) ceil($p / 100 * count($arr)) - 1;
        $index = max(0, $index);
        return round((float) $arr[$index], 2);
    }
}
