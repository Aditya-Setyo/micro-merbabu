<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\CircuitBreaker;
use Illuminate\Support\Facades\Http;

class TestCircuitBreaker extends Command
{
    protected $signature = 'circuit:test';
    protected $description = 'Test otomatis Retry + Circuit Breaker Uji 1-5 untuk sidang';

    protected CircuitBreaker $circuit;
    protected string $gateUpUrl = 'http://127.0.0.1:8004/api/tickets/confirm';
    protected string $gateDownUrl = 'http://127.0.0.1:8999/api/tickets/confirm';

    public function handle()
    {
        $this->info('=== TEST OTOMATIS RETRY + CIRCUIT BREAKER ===');
        $this->info('Gate asli tetap jalan di 8004, Gate mati disimulasikan via port 8999');
        $this->line('');

        $this->circuit = new CircuitBreaker('gate');
        $this->circuit->reset();

        // Uji 1
        $this->info('[UJI 1] Gate jalan, Circuit CLOSED');
        $this->circuit->reset();
        $result = $this->callGate($this->gateUpUrl, 3);
        $state = $this->circuit->getStateName();
        if ($result && $state === 'CLOSED') {
            $this->info('  -> PASS: Sukses, State = CLOSED, failures = 0');
        } else {
            $this->error('  -> FAIL: State = ' . $state);
        }
        $this->line('');

        // Uji 2
        $this->info('[UJI 2] Gate mati, Retry 3x lalu OPEN');
        $this->circuit->reset();
        $start = microtime(true);
        $result = $this->callGate($this->gateDownUrl, 3);
        $duration = round(microtime(true) - $start, 1);
        $state = $this->circuit->getState();
        if (!$result && $state['state'] === 'OPEN' && $state['failures'] >= 3) {
            $this->info('  -> PASS: Gagal 3x dalam ' . $duration . ' detik, State = OPEN, failures = ' . $state['failures']);
        } else {
            $this->error('  -> FAIL: State = ' . $state['state']);
        }
        $this->line('');

        // Uji 3
        $this->info('[UJI 3] Fail Fast 503 saat OPEN');
        $start = microtime(true);
        $canAttempt = $this->circuit->canAttempt();
        $duration = round(microtime(true) - $start, 2);
        if (!$canAttempt && $duration < 0.5) {
            $this->info('  -> PASS: Langsung ditolak dalam ' . $duration . ' detik, tanpa retry. State = OPEN (503 Fail Fast)');
        } else {
            $this->error('  -> FAIL: Seharusnya Fail Fast, tapi canAttempt = ' . ($canAttempt ? 'true' : 'false'));
        }
        $this->line('');

        // Uji 4
        $this->info('[UJI 4] HALF-OPEN -> CLOSED (Gate pulih)');
        $this->info('  Tunggu 30 detik untuk masuk HALF-OPEN...');
        $this->countdown(30);
        $canAttempt = $this->circuit->canAttempt();
        $stateBefore = $this->circuit->getStateName();
        $this->info('  State setelah 30 detik: ' . $stateBefore);
        // HALF-OPEN cuma 1 percobaan
        $result = $this->callGate($this->gateUpUrl, 1);
        $state = $this->circuit->getStateName();
        if ($result && $state === 'CLOSED') {
            $this->info('  -> PASS: Request pengujian HALF-OPEN sukses, State balik CLOSED');
        } else {
            $this->error('  -> FAIL: State = ' . $state);
        }
        $this->line('');

        // Uji 5
        $this->info('[UJI 5] HALF-OPEN -> OPEN lagi (Gate masih mati)');
        $this->circuit->reset();
        $this->callGate($this->gateDownUrl, 3); // Bikin OPEN lagi
        $this->info('  Sudah OPEN lagi, tunggu 30 detik untuk HALF-OPEN...');
        $this->countdown(30);
        $this->circuit->canAttempt(); // Ubah OPEN -> HALF_OPEN
        $this->info('  State sekarang: ' . $this->circuit->getStateName());
        $result = $this->callGate($this->gateDownUrl, 1); // Test 1x, harus gagal
        $state = $this->circuit->getStateName();
        if (!$result && $state === 'OPEN') {
            $this->info('  -> PASS: Request pengujian HALF-OPEN gagal, balik lagi OPEN + 503');
        } else {
            $this->error('  -> FAIL: State = ' . $state);
        }
        $this->line('');

        $this->info('=== SELESAI, SEMUA UJI OTOMATIS JALAN ===');
        $this->info('Untuk reset: php artisan tinker -> (new \\App\\Services\\CircuitBreaker(\'gate\'))->reset()');
        return 0;
    }

    // Fungsi yang sama persis seperti di payVa: retry + catat sukses / gagal
    protected function callGate(string $url, int $maxAttempts): bool
    {
        for ($i = 1; $i <= $maxAttempts; $i++) {
            try {
                // Kirim POST seperti payVa, data dummy saja.
                // Kalau Gate hidup, dia akan balas response apa pun (200, 404, 422).
                // Itu tetap dihitung SUKSES, karena artinya Gate nyambung.
                // Kalau Gate mati, baru throw ConnectException.
                $response = Http::timeout(3)->post($url, [
                    'booking_id' => 0,
                    'payment_id' => 0,
                    'status' => 'TEST',
                ]);

                $this->circuit->recordSuccess();
                $this->line('    Percobaan ke-' . $i . ': SUKSES - Gate balas HTTP ' . $response->status());
                return true;
            } catch (\Exception $e) {
                $this->line('    Percobaan ke-' . $i . ': GAGAL - ' . substr($e->getMessage(), 0, 80));
                $this->circuit->recordFailure();
                if ($i < $maxAttempts) {
                    sleep(1);
                }
            }
        }
        return false;
    }

    protected function countdown(int $seconds): void
    {
        for ($i = $seconds; $i > 0; $i--) {
            $this->output->write("\r    Menunggu... " . $i . ' detik ');
            sleep(1);
        }
        $this->output->write("\r    Menunggu... selesai          \n");
    }
}
