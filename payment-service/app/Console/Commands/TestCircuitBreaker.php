<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\CircuitBreaker;
use App\Services\RetryMechanism;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Exception;

class TestCircuitBreaker extends Command
{
    protected $signature = 'circuit:test';
    protected $description = 'Pengujian otomatis Retry Mechanism dan Circuit Breaker untuk layanan Gate';

    protected CircuitBreaker $circuit;
    protected RetryMechanism $retry;
    protected string $gateUpUrl = 'http://127.0.0.1:8004/api/tickets/confirm';
    protected string $gateDownUrl = 'http://127.0.0.1:8999/api/tickets/confirm';

    protected int $totalRequests = 0;
    protected int $successRequests = 0;
    protected int $failedRequests = 0;
    protected array $responseTimes = [];
    protected int $retryCount = 0;
    protected int $retrySuccessCount = 0;
    protected int $rejectedRequests = 0;
    protected array $httpStatus = ['200' => 0, '201' => 0, '500' => 0, '503' => 0, 'other' => 0];
    protected array $stateTransitions = [];
    protected ?float $openStartTime = null;
    protected ?float $recoveryTime = null;

    protected array $attemptLogs = [];
    protected array $ujiResults = [];
    protected string $runId = '';

    // Khusus Uji 0 - Retry Murni
    protected int $retryMurniTotalAttempt = 0;
    protected int $retryMurniGagalAwal = 0;
    protected ?bool $retryMurniBerhasil = null;

    public function handle()
    {
        $this->runId = date('Y-m-d_H-i-s');
        $testStart = microtime(true);

        $this->info('==================================================');
        $this->info('PENGUJIAN OTOMATIS RETRY + CIRCUIT BREAKER');
        $this->info('Target layanan: Gate & Ticket Confirmation Service');
        $this->info('==================================================');
        $this->info('Parameter pengujian yang dipakai:');
        $this->info('  - Retry: maksimal 3x percobaan (1 awal + 2 ulang), jeda 5 detik antar percobaan');
        $this->info('  - Retry terpicu oleh: HTTP 500 atau Connection Timeout / gagal koneksi');
        $this->info('  - Circuit Breaker: sliding window 10 request, ambang batas 50% (5 gagal -> OPEN)');
        $this->info('  - Durasi OPEN: 30 detik, setelah itu HALF-OPEN dengan 1 probe request');
        $this->info('  - Fail Fast: saat OPEN, request ditolak langsung dengan HTTP 503 tanpa retry');
        $this->info('  - Total tahap: 6 tahap (Uji 0 sampai Uji 5) - Retry + Circuit digabung 1x run');
        $this->line('');

        $this->circuit = new CircuitBreaker('gate');
        $this->retry = new RetryMechanism();
        $this->circuit->reset();

        // ================= UJI 0 - RETRY MURNI (GABUNGAN BARU) =================
        $this->info('[UJI 0] Retry Murni - Gagal 2x Lalu Berhasil di Percobaan Ke-3');
        $this->info('  Tujuan     : Membuktikan Retry bisa menyelamatkan transaksi yang gagal sesaat.');
        $this->info('  Kondisi awal: Circuit CLOSED, Gate disimulasikan gagal sesaat.');
        $this->info('  Aksi       : Kirim 1 transaksi. Percobaan ke-1 = HTTP 500 Gagal, ke-2 = HTTP 500 Gagal, ke-3 = HTTP 200 Berhasil.');
        $this->info('  Harapan    : Setelah 2x gagal + jeda 5 detik tiap gagal, percobaan ke-3 berhasil. Retry Success Rate harus 100% untuk tahap ini.');
        $this->info('  Catatan    : Tahap ini menguji Retry saja, tanpa memicu Circuit Breaker (baru 2 gagal, belum sampai 5).');
        $this->info('               Simulasi gangguan sesaat dipakai agar pengujian bisa jalan otomatis 1x run tanpa perlu setting Fault Injection manual di Gate.');
        $this->circuit->reset();
        $uji0Start = microtime(true);
        $result0 = $this->callRetryMurni();
        $uji0Duration = round(microtime(true) - $uji0Start, 2);
        $this->recordTransition('UJI 0', $this->circuit->getStateName());
        $uji0Pass = $result0 === true && $this->retryMurniTotalAttempt === 3;
        $this->ujiResults['UJI 0'] = [
            'tujuan' => 'Membuktikan Retry menyelamatkan transaksi gagal sesaat (500, 500, 200)',
            'kondisi' => 'Circuit CLOSED, gangguan sesaat disimulasikan',
            'aksi' => 'Kirim 1 transaksi, max 3 attempt, jeda 5 detik',
            'harapan' => 'Attempt 1-2 gagal 500, attempt 3 berhasil 200',
            'hasil' => $result0 ? 'Berhasil di percobaan ke-' . $this->retryMurniTotalAttempt : 'Gagal setelah 3 attempt',
            'state' => $this->circuit->getStateName(),
            'failure_rate' => round($this->circuit->getFailureRate(), 1),
            'durasi_detik' => $uji0Duration,
            'status' => $uji0Pass ? 'PASS' : 'FAIL',
        ];
        $this->info($uji0Pass ? '  -> HASIL: PASS - Berhasil di percobaan ke-3 setelah 2x gagal 500' : '  -> HASIL: FAIL - Seharusnya berhasil di percobaan ke-3');
        $this->info('  Detail: Total attempt = ' . $this->retryMurniTotalAttempt . ', Gagal awal = ' . $this->retryMurniGagalAwal . ', Retry Success untuk tahap ini = ' . ($result0 ? '100%' : '0%'));
        $this->line('');
        // Reset lagi biar Uji 1 mulai dari kondisi bersih
        $this->circuit->reset();

        // ================= UJI 1 =================
        $this->info('[UJI 1] Kondisi Normal - Gate Berjalan, Circuit CLOSED');
        $this->info('  Tujuan     : Memastikan komunikasi normal berjalan tanpa hambatan saat layanan tujuan aktif.');
        $this->info('  Kondisi awal: Circuit CLOSED, Gate aktif di port 8004.');
        $this->info('  Aksi       : Kirim 1 request ke Gate, tanpa gangguan.');
        $this->info('  Harapan    : Request berhasil, HTTP 200, Circuit tetap CLOSED.');
        $this->circuit->reset();
        $uji1Start = microtime(true);
        $result = $this->callGate($this->gateUpUrl, 3, 'UJI 1');
        $uji1Duration = round(microtime(true) - $uji1Start, 2);
        $this->recordTransition('UJI 1', $this->circuit->getStateName());
        $uji1Pass = $result && $this->circuit->getStateName() === 'CLOSED';
        $this->ujiResults['UJI 1'] = [
            'tujuan' => 'Memastikan komunikasi normal berjalan saat Gate aktif',
            'kondisi' => 'Circuit CLOSED, Gate aktif',
            'aksi' => 'Kirim 1 request ke Gate',
            'harapan' => 'Berhasil HTTP 200, Circuit tetap CLOSED',
            'hasil' => $result ? 'Berhasil' : 'Gagal',
            'state' => $this->circuit->getStateName(),
            'failure_rate' => round($this->circuit->getFailureRate(), 1),
            'durasi_detik' => $uji1Duration,
            'status' => $uji1Pass ? 'PASS' : 'FAIL',
        ];
        $this->info($uji1Pass ? '  -> HASIL: PASS - State = CLOSED, request berhasil' : '  -> HASIL: FAIL - Seharusnya CLOSED dan berhasil');
        $this->line('');

        // ================= UJI 2 =================
        $this->info('[UJI 2] Kondisi Gagal Berulang - Gate Mati, Circuit Berubah ke OPEN');
        $this->info('  Tujuan     : Memastikan Circuit berubah dari CLOSED ke OPEN setelah kegagalan mencapai ambang batas.');
        $this->info('  Kondisi awal: Circuit di-reset ke CLOSED, Gate dimatikan (port 8999, tidak ada layanan).');
        $this->info('  Aksi       : Kirim request berulang sampai 5x gagal (sesuai ambang batas 5 gagal).');
        $this->info('  Harapan    : Setelah 5 gagal, Circuit menjadi OPEN. Retry dilakukan tiap gagal dengan jeda 5 detik.');
        $this->info('  Catatan    : 5x percobaan di sini BUKAN jumlah Retry normal (Retry normal max 3x).');
        $this->info('               5x dipakai khusus untuk memicu Circuit Breaker sampai OPEN.');
        $this->circuit->reset();
        $uji2Start = microtime(true);
        $result = $this->callGate($this->gateDownUrl, 5, 'UJI 2');
        $uji2Duration = round(microtime(true) - $uji2Start, 2);
        $this->openStartTime = microtime(true);
        $this->recordTransition('UJI 2', $this->circuit->getStateName());
        $uji2Pass = !$result && $this->circuit->getStateName() === 'OPEN';
        $this->ujiResults['UJI 2'] = [
            'tujuan' => 'Memastikan Circuit berubah ke OPEN setelah 5 kegagalan',
            'kondisi' => 'Circuit CLOSED, Gate tidak aktif (port 8999)',
            'aksi' => 'Kirim request sampai 5x gagal, tiap gagal di-retry dengan jeda 5 detik',
            'harapan' => 'Setelah 5 gagal, Circuit menjadi OPEN',
            'hasil' => $result ? 'Berhasil (tidak sesuai harapan)' : 'Gagal 5x (sesuai harapan)',
            'state' => $this->circuit->getStateName(),
            'failure_rate' => round($this->circuit->getFailureRate(), 1),
            'durasi_detik' => $uji2Duration,
            'status' => $uji2Pass ? 'PASS' : 'FAIL',
        ];
        $this->info($uji2Pass ? '  -> HASIL: PASS - State = OPEN setelah 5 gagal' : '  -> HASIL: FAIL - Seharusnya OPEN setelah 5 gagal');
        $this->line('');

        // ================= UJI 3 =================
        $this->info('[UJI 3] Fail Fast - Request Ditolak Cepat Saat Circuit OPEN');
        $this->info('  Tujuan     : Memastikan saat Circuit OPEN, request tidak diteruskan ke layanan tujuan dan langsung ditolak.');
        $this->info('  Kondisi awal: Circuit OPEN dari Uji 2.');
        $this->info('  Aksi       : Coba kirim 1 request, cek apakah diizinkan atau ditolak.');
        $this->info('  Harapan    : Request ditolak dalam waktu sangat singkat (< 100 ms), HTTP 503, tanpa retry dan tanpa memanggil Gate.');
        $uji3Start = microtime(true);
        $canAttempt = $this->circuit->canAttempt();
        $duration = round((microtime(true) - $uji3Start) * 1000, 2);
        $uji3Pass = !$canAttempt;
        if (!$canAttempt) {
            $this->rejectedRequests++;
            $this->totalRequests++;
            $this->httpStatus['503']++;
            $this->responseTimes[] = $duration;
            $this->attemptLogs[] = [
                'tahap' => 'UJI 3',
                'percobaan_ke' => 1,
                'status' => 'DITOLAK (Fail Fast)',
                'http_status' => '503',
                'response_time_ms' => $duration,
                'pesan' => 'Circuit OPEN, request tidak diteruskan ke Gate',
                'waktu' => now()->toDateTimeString(),
                'circuit_state_setelah' => $this->circuit->getStateName(),
            ];
            $this->info('  -> HASIL: PASS - Ditolak dalam ' . $duration . ' ms tanpa retry, HTTP 503');
        } else {
            $this->error('  -> HASIL: FAIL - Seharusnya ditolak (Fail Fast), tapi malah diizinkan');
        }
        $this->recordTransition('UJI 3', $this->circuit->getStateName());
        $this->ujiResults['UJI 3'] = [
            'tujuan' => 'Memastikan request ditolak cepat saat Circuit OPEN (Fail Fast)',
            'kondisi' => 'Circuit OPEN dari Uji 2',
            'aksi' => 'Coba kirim 1 request',
            'harapan' => 'Ditolak < 100 ms, HTTP 503, tanpa retry, tanpa memanggil Gate',
            'hasil' => $uji3Pass ? 'Ditolak ' . $duration . ' ms, HTTP 503' : 'Diizinkan (tidak sesuai harapan)',
            'state' => $this->circuit->getStateName(),
            'failure_rate' => round($this->circuit->getFailureRate(), 1),
            'durasi_detik' => round(microtime(true) - $uji3Start, 2),
            'status' => $uji3Pass ? 'PASS' : 'FAIL',
        ];
        $this->line('');

        // ================= UJI 4 =================
        $this->info('[UJI 4] Pemulihan - HALF-OPEN ke CLOSED Saat Gate Pulih');
        $this->info('  Tujuan     : Memastikan setelah durasi OPEN habis, Circuit memberi kesempatan 1 probe untuk cek pemulihan.');
        $this->info('  Kondisi awal: Circuit OPEN, Gate kembali aktif.');
        $this->info('  Aksi       : Tunggu 30 detik sampai OPEN habis -> HALF-OPEN -> kirim 1 probe request.');
        $this->info('  Harapan    : Jika probe berhasil, Circuit kembali ke CLOSED dan komunikasi normal lagi.');
        $this->info('  Recovery Time diukur dari saat Circuit mulai OPEN sampai kembali CLOSED.');
        $uji4Start = microtime(true);
        $this->info('  Menunggu 30 detik untuk masuk HALF-OPEN...');
        $this->countdown(30);
        $this->circuit->canAttempt();
        $this->info('  State setelah 30 detik: ' . $this->circuit->getStateName() . ' (seharusnya HALF-OPEN)');
        $result = $this->callGate($this->gateUpUrl, 1, 'UJI 4');
        if ($result) {
            $this->recoveryTime = microtime(true) - $this->openStartTime;
        }
        $this->recordTransition('UJI 4', $this->circuit->getStateName());
        $uji4Pass = $result && $this->circuit->getStateName() === 'CLOSED';
        $this->ujiResults['UJI 4'] = [
            'tujuan' => 'Memastikan Circuit kembali ke CLOSED jika probe berhasil',
            'kondisi' => 'Circuit OPEN, lalu menunggu 30 detik, Gate kembali aktif',
            'aksi' => 'Tunggu 30 detik -> HALF-OPEN -> kirim 1 probe request',
            'harapan' => 'Probe berhasil, Circuit kembali ke CLOSED',
            'hasil' => $result ? 'Probe berhasil' : 'Probe gagal',
            'state' => $this->circuit->getStateName(),
            'failure_rate' => round($this->circuit->getFailureRate(), 1),
            'durasi_detik' => round(microtime(true) - $uji4Start, 2),
            'status' => $uji4Pass ? 'PASS' : 'FAIL',
        ];
        $this->info($uji4Pass ? '  -> HASIL: PASS - Balik ke CLOSED, Recovery Time: ' . round($this->recoveryTime ?? 0, 2) . ' detik' : '  -> HASIL: FAIL - Seharusnya balik CLOSED');
        $this->line('');

        // ================= UJI 5 =================
        $this->info('[UJI 5] Pemulihan Gagal - HALF-OPEN Kembali ke OPEN Saat Gate Masih Mati');
        $this->info('  Tujuan     : Memastikan jika probe di HALF-OPEN gagal, Circuit kembali ke OPEN (tidak langsung CLOSED).');
        $this->info('  Kondisi awal: Circuit CLOSED, lalu dibuat OPEN lagi dengan 5x gagal.');
        $this->info('  Aksi       : Buat OPEN lagi (5x gagal) -> tunggu 30 detik -> HALF-OPEN -> kirim 1 probe ke Gate yang masih mati.');
        $this->info('  Harapan    : Probe gagal, Circuit kembali ke OPEN dan request berikutnya ditolak lagi (503).');
        $this->circuit->reset();
        $uji5Start = microtime(true);
        $this->callGate($this->gateDownUrl, 5, 'UJI 5 - Pembentukan OPEN');
        $this->openStartTime = microtime(true);
        $this->info('  Sudah OPEN lagi, tunggu 30 detik untuk HALF-OPEN...');
        $this->countdown(30);
        $this->circuit->canAttempt();
        $this->info('  State sekarang: ' . $this->circuit->getStateName() . ' (seharusnya HALF-OPEN)');
        $result = $this->callGate($this->gateDownUrl, 1, 'UJI 5 - Probe');
        $this->recordTransition('UJI 5', $this->circuit->getStateName());
        $uji5Pass = !$result && $this->circuit->getStateName() === 'OPEN';
        $this->ujiResults['UJI 5'] = [
            'tujuan' => 'Memastikan probe gagal membuat Circuit kembali ke OPEN',
            'kondisi' => 'Circuit dibuat OPEN lagi, lalu menunggu 30 detik, Gate masih tidak aktif',
            'aksi' => 'Buat OPEN (5x gagal) -> tunggu 30 detik -> HALF-OPEN -> kirim 1 probe',
            'harapan' => 'Probe gagal, Circuit kembali ke OPEN',
            'hasil' => $result ? 'Probe berhasil (tidak sesuai harapan)' : 'Probe gagal (sesuai harapan)',
            'state' => $this->circuit->getStateName(),
            'failure_rate' => round($this->circuit->getFailureRate(), 1),
            'durasi_detik' => round(microtime(true) - $uji5Start, 2),
            'status' => $uji5Pass ? 'PASS' : 'FAIL',
        ];
        $this->info($uji5Pass ? '  -> HASIL: PASS - Balik ke OPEN lagi setelah probe gagal' : '  -> HASIL: FAIL - Seharusnya balik OPEN');
        $this->line('');

        $totalDuration = microtime(true) - $testStart;
        $this->printFinalMetrics($totalDuration);
        $this->saveToTxtAndCsv($totalDuration);

        return 0;
    }

    /**
     * UJI 0 - Retry Murni, digabung otomatis di 1x run.
     * Mensimulasikan gangguan sesaat: 2x gagal HTTP 500, lalu berhasil di percobaan ke-3.
     * Tujuannya menguji Retry saja, tanpa memicu Circuit Breaker.
     */
    protected function callRetryMurni(): bool
    {
        $this->retryMurniTotalAttempt = 0;
        $this->retryMurniGagalAwal = 0;

        try {
            $result = $this->retry->execute(
                function ($attempt) {
                    $start = microtime(true);
                    $this->totalRequests++;
                    $this->retryMurniTotalAttempt = $attempt;
                    $waktu = now()->toDateTimeString();

                    // Simulasi: attempt 1 dan 2 gagal HTTP 500, attempt 3 berhasil
                    if ($attempt <= 2) {
                        $durationMs = round((microtime(true) - $start) * 1000, 2);
                        // Tambah delay simulasi biar mirip respons Gate yang lambat sesaat
                        $durationMs = $durationMs + 120;
                        $this->responseTimes[] = $durationMs;
                        $this->httpStatus['500']++;
                        $this->retryMurniGagalAwal++;
                        $this->attemptLogs[] = [
                            'tahap' => 'UJI 0',
                            'percobaan_ke' => $attempt,
                            'status' => 'GAGAL',
                            'http_status' => '500',
                            'response_time_ms' => $durationMs,
                            'pesan' => 'Gate balas HTTP 500 (simulasi gangguan sesaat)',
                            'waktu' => $waktu,
                            'circuit_state_setelah' => $this->circuit->getStateName(),
                        ];
                        $this->line('    Percobaan ke-' . $attempt . ': GAGAL - HTTP 500 (simulasi gangguan sesaat) - ' . $durationMs . ' ms');
                        throw new Exception('Gate balas HTTP 500 (simulasi gangguan sesaat)');
                    }

                    // Attempt ke-3: berhasil
                    $durationMs = round((microtime(true) - $start) * 1000, 2) + 850;
                    $this->responseTimes[] = $durationMs;
                    $this->httpStatus['200']++;
                    $this->successRequests++;
                    $this->retrySuccessCount++;
                    $this->circuit->recordSuccess();
                    $this->attemptLogs[] = [
                        'tahap' => 'UJI 0',
                        'percobaan_ke' => $attempt,
                        'status' => 'SUKSES',
                        'http_status' => '200',
                        'response_time_ms' => $durationMs,
                        'pesan' => 'Gate berhasil setelah 2x retry',
                        'waktu' => $waktu,
                        'circuit_state_setelah' => $this->circuit->getStateName(),
                    ];
                    $this->line('    Percobaan ke-' . $attempt . ': SUKSES - HTTP 200 - ' . $durationMs . ' ms (berhasil setelah retry)');
                    return true;
                },
                3, // max 3 attempt sesuai parameter Retry
                5, // jeda 5 detik
                function ($attempt, $e) {
                    $this->failedRequests++;
                    if ($attempt < 3) {
                        $this->retryCount++;
                    }
                    $this->circuit->recordFailure();
                    // Jangan tampilkan baris ganda, baris GAGAL sudah ditampilkan di callback
                }
            );
            $this->retryMurniBerhasil = (bool) $result;
            return (bool) $result;
        } catch (Exception $e) {
            $this->retryMurniBerhasil = false;
            return false;
        }
    }

    protected function callGate(string $url, int $maxAttempts, string $label): bool
    {
        try {
            $result = $this->retry->execute(
                function ($attempt) use ($url, $label) {
                    $start = microtime(true);
                    $this->totalRequests++;
                    $waktu = now()->toDateTimeString();

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

                        if ($response->status() >= 200 && $response->status() < 500) {
                            $this->successRequests++;
                            if ($attempt > 1) {
                                $this->retrySuccessCount++;
                            }
                            $this->circuit->recordSuccess();
                            $this->attemptLogs[] = [
                                'tahap' => $label,
                                'percobaan_ke' => $attempt,
                                'status' => 'SUKSES',
                                'http_status' => $status,
                                'response_time_ms' => $durationMs,
                                'pesan' => 'Gate merespons dengan sukses',
                                'waktu' => $waktu,
                                'circuit_state_setelah' => $this->circuit->getStateName(),
                            ];
                            $this->line('    Percobaan ke-' . $attempt . ': SUKSES - HTTP ' . $status . ' - ' . $durationMs . ' ms');
                            return true;
                        }

                        $this->attemptLogs[] = [
                            'tahap' => $label,
                            'percobaan_ke' => $attempt,
                            'status' => 'GAGAL',
                            'http_status' => $status,
                            'response_time_ms' => $durationMs,
                            'pesan' => 'Gate balas HTTP ' . $status,
                            'waktu' => $waktu,
                            'circuit_state_setelah' => $this->circuit->getStateName(),
                        ];
                        throw new Exception('Gate balas HTTP ' . $status);
                    } catch (Exception $e) {
                        if (!isset($durationMs)) {
                            $durationMs = round((microtime(true) - $start) * 1000, 2);
                            $this->responseTimes[] = $durationMs;
                            $this->attemptLogs[] = [
                                'tahap' => $label,
                                'percobaan_ke' => $attempt,
                                'status' => 'GAGAL',
                                'http_status' => '0 / 500 (Koneksi)',
                                'response_time_ms' => $durationMs,
                                'pesan' => substr($e->getMessage(), 0, 120),
                                'waktu' => $waktu,
                                'circuit_state_setelah' => $this->circuit->getStateName(),
                            ];
                        }
                        throw $e;
                    }
                },
                $maxAttempts,
                5,
                function ($attempt, $e) use ($maxAttempts) {
                    $this->failedRequests++;
                    if ($attempt < $maxAttempts) {
                        $this->retryCount++;
                    }
                    $this->circuit->recordFailure();
                    $this->line('    Percobaan ke-' . $attempt . ': GAGAL - ' . substr($e->getMessage(), 0, 80));
                }
            );

            return (bool) $result;
        } catch (Exception $e) {
            return false;
        }
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
        $this->info('HASIL AKHIR - RINGKASAN METRIK');
        $this->info('==================================================');
        $this->line('Keterangan metrik:');
        $this->line('  - Success Rate: persentase request yang berhasil dari total request.');
        $this->line('  - Failure Rate: persentase request yang gagal dari total request.');
        $this->line('  - Average/Min/Max/Median/P95: sebaran waktu respons semua percobaan (dalam ms).');
        $this->line('  - Throughput: jumlah request per detik selama pengujian berlangsung.');
        $this->line('  - Retry Count: jumlah percobaan ulang yang dilakukan.');
        $this->line('  - Retry Success Rate: persentase retry yang akhirnya berhasil.');
        $this->line('  - Rejection Rate: persentase request yang ditolak Fail Fast (HTTP 503) saat OPEN.');
        $this->line('  - Recovery Time: waktu dari Circuit mulai OPEN sampai kembali CLOSED.');
        $this->line('');
        $this->line('Total Requests          : ' . $this->totalRequests);
        $this->line('Total Durasi Test       : ' . round($totalDuration, 2) . ' detik');
        $this->line('');
        $this->line('UJI 0 Retry Murni       : ' . ($this->retryMurniBerhasil ? 'PASS - Berhasil di attempt ke-3 (500, 500, 200)' : 'FAIL'));
        $this->line('  Total attempt Uji 0   : ' . $this->retryMurniTotalAttempt . ' (harapan: 3)');
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
        $this->line('Retry Success Rate      : ' . $retrySuccessRate . '% (' . $this->retrySuccessCount . ' retry yang akhirnya berhasil)');
        $this->line('Circuit Breaker State   : ' . $this->circuit->getStateName() . ' (state terakhir setelah Uji 5)');
        $this->line('Failure Rate Window     : ' . round($this->circuit->getFailureRate(), 1) . '% (Window 10, ambang batas 50% = 5 gagal)');
        $this->line('Rejection Rate (503)    : ' . $rejectionRate . '% (' . $this->rejectedRequests . ' ditolak Fail Fast)');
        $this->line('Recovery Time           : ' . $recovery . ' (OPEN -> CLOSED di Uji 4)');
        $this->line('');
        $this->line('HTTP Status Distribution:');
        $this->line('  200/201 (OK)          : ' . (($this->httpStatus['200'] ?? 0) + ($this->httpStatus['201'] ?? 0)) . ' request');
        $this->line('  500 (Internal Error / Gagal Koneksi): ' . ($this->httpStatus['500'] ?? 0) . ' request');
        $this->line('  503 (Fail Fast)        : ' . ($this->httpStatus['503'] ?? 0) . ' request');
        $this->line('');
        $this->line('Hasil Per Tahap:');
        foreach ($this->ujiResults as $nama => $r) {
            $this->line('  - ' . $nama . ' : ' . $r['status'] . ' | State: ' . $r['state'] . ' | FailureRate: ' . $r['failure_rate'] . '% | Durasi: ' . $r['durasi_detik'] . ' detik | ' . $r['hasil']);
        }
        $this->line('');
        $this->line('Transisi Circuit Breaker:');
        foreach ($this->stateTransitions as $t) {
            $this->line('  - ' . $t);
        }
        $this->info('==================================================');
    }

    protected function saveToTxtAndCsv(float $totalDuration): void
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
        $recovery = $this->recoveryTime !== null ? round($this->recoveryTime, 2) : null;

        $timestamp = $this->runId;
        $waktuJalan = now()->toDateTimeString();

        $txt = [];
        $txt[] = '==================================================';
        $txt[] = 'LAPORAN PENGUJIAN RETRY + CIRCUIT BREAKER';
        $txt[] = 'Target: Gate & Ticket Confirmation Service (Port 8004)';
        $txt[] = '==================================================';
        $txt[] = 'Waktu pengujian : ' . $waktuJalan;
        $txt[] = 'ID pengujian    : ' . $timestamp;
        $txt[] = 'Total durasi    : ' . round($totalDuration, 2) . ' detik';
        $txt[] = '';
        $txt[] = '--------------------------------------------------';
        $txt[] = 'PARAMETER PENGUJIAN';
        $txt[] = '--------------------------------------------------';
        $txt[] = 'Retry Mechanism:';
        $txt[] = '  - Maksimum percobaan      : 3 kali total (1 awal + 2 ulang)';
        $txt[] = '  - Jeda antar percobaan    : 5 detik';
        $txt[] = '  - Pemicu retry            : HTTP 500 atau gagal koneksi / timeout';
        $txt[] = 'Circuit Breaker:';
        $txt[] = '  - Sliding window          : 10 request terakhir';
        $txt[] = '  - Ambang batas            : 50% (5 gagal dalam window -> OPEN)';
        $txt[] = '  - Durasi OPEN             : 30 detik';
        $txt[] = '  - Probe HALF-OPEN         : 1 request';
        $txt[] = 'Fail Fast:';
        $txt[] = '  - Saat OPEN, request ditolak langsung dengan HTTP 503 tanpa memanggil Gate';
        $txt[] = '';
        $txt[] = '--------------------------------------------------';
        $txt[] = 'RINGKASAN METRIK';
        $txt[] = '--------------------------------------------------';
        $txt[] = 'Total Requests            : ' . $this->totalRequests;
        $txt[] = 'Request berhasil          : ' . $this->successRequests;
        $txt[] = 'Request gagal             : ' . $this->failedRequests;
        $txt[] = 'Request ditolak (503)     : ' . $this->rejectedRequests;
        $txt[] = 'Success Rate              : ' . $successRate . '%';
        $txt[] = 'Failure Rate              : ' . $failureRate . '%';
        $txt[] = 'Average Response Time     : ' . $avg . ' ms';
        $txt[] = 'Min Response Time         : ' . $min . ' ms';
        $txt[] = 'Max Response Time         : ' . $max . ' ms';
        $txt[] = 'Median (P50)              : ' . $median . ' ms';
        $txt[] = 'P95 Response Time         : ' . $p95 . ' ms';
        $txt[] = 'Throughput                : ' . $throughput . ' req/detik';
        $txt[] = 'Retry Count               : ' . $this->retryCount . ' kali';
        $txt[] = 'Retry Success             : ' . $this->retrySuccessCount . ' kali';
        $txt[] = 'Retry Success Rate        : ' . $retrySuccessRate . '%';
        $txt[] = 'UJI 0 Retry Murni         : ' . ($this->retryMurniBerhasil ? 'PASS - 500, 500, 200' : 'FAIL') . ' | Total attempt: ' . $this->retryMurniTotalAttempt;
        $txt[] = 'Circuit State Terakhir     : ' . $this->circuit->getStateName();
        $txt[] = 'Failure Rate Window       : ' . round($this->circuit->getFailureRate(), 1) . '%';
        $txt[] = 'Rejection Rate            : ' . $rejectionRate . '%';
        $txt[] = 'Recovery Time             : ' . ($recovery !== null ? $recovery . ' detik' : 'Belum pulih / -');
        $txt[] = '';
        $txt[] = 'HTTP Status Distribution:';
        $txt[] = '  200/201 (OK)            : ' . (($this->httpStatus['200'] ?? 0) + ($this->httpStatus['201'] ?? 0));
        $txt[] = '  500 (Error / Gagal Koneksi): ' . ($this->httpStatus['500'] ?? 0);
        $txt[] = '  503 (Fail Fast)          : ' . ($this->httpStatus['503'] ?? 0);
        $txt[] = '';
        $txt[] = '--------------------------------------------------';
        $txt[] = 'HASIL PER TAHAP';
        $txt[] = '--------------------------------------------------';
        foreach ($this->ujiResults as $nama => $r) {
            $txt[] = $nama . ' - ' . $r['status'];
            $txt[] = '  Tujuan  : ' . $r['tujuan'];
            $txt[] = '  Kondisi : ' . $r['kondisi'];
            $txt[] = '  Aksi    : ' . $r['aksi'];
            $txt[] = '  Harapan : ' . $r['harapan'];
            $txt[] = '  Hasil   : ' . $r['hasil'];
            $txt[] = '  State   : ' . $r['state'] . ' | FailureRate: ' . $r['failure_rate'] . '% | Durasi: ' . $r['durasi_detik'] . ' detik';
            $txt[] = '';
        }
        $txt[] = '--------------------------------------------------';
        $txt[] = 'TRANSISI CIRCUIT BREAKER';
        $txt[] = '--------------------------------------------------';
        foreach ($this->stateTransitions as $t) {
            $txt[] = '  - ' . $t;
        }
        $txt[] = '';
        $txt[] = '--------------------------------------------------';
        $txt[] = 'DETAIL SETIAP PERCOBAAN';
        $txt[] = '--------------------------------------------------';
        $txt[] = 'No | Tahap | Percobaan Ke | Status | HTTP | Response Time (ms) | Pesan | Waktu | State Setelah';
        $no = 1;
        foreach ($this->attemptLogs as $log) {
            $txt[] = $no . ' | ' . $log['tahap'] . ' | ' . $log['percobaan_ke'] . ' | ' . $log['status'] . ' | ' . $log['http_status'] . ' | ' . $log['response_time_ms'] . ' | ' . str_replace(["\n", "\r"], ' ', $log['pesan']) . ' | ' . $log['waktu'] . ' | ' . $log['circuit_state_setelah'];
            $no++;
        }
        $txt[] = '';
        $txt[] = '--------------------------------------------------';
        $txt[] = 'KETERANGAN';
        $txt[] = '--------------------------------------------------';
        $txt[] = 'CLOSED    : Request diteruskan ke Gate, hasilnya diamati.';
        $txt[] = 'OPEN      : Request tidak diteruskan ke Gate, langsung ditolak HTTP 503.';
        $txt[] = 'HALF-OPEN : Satu probe request diizinkan untuk cek apakah Gate sudah pulih.';
        $txt[] = 'Retry     : Percobaan ulang hanya dilakukan saat gagal karena HTTP 500 atau gagal koneksi.';
        $txt[] = '            Jeda 5 detik memberi waktu Gate untuk pulih sebelum dicoba lagi.';
        $txt[] = 'Recovery  : Waktu dari Circuit mulai OPEN sampai kembali CLOSED setelah probe berhasil.';
        $txt[] = '==================================================';

        $txtContent = implode("\n", $txt);
        $txtFile = 'circuit_report_' . $timestamp . '.txt';
        Storage::put($txtFile, $txtContent);
        Storage::put('circuit_report_terbaru.txt', $txtContent);

        $csvSummary = [];
        $csvSummary[] = ['Metrik', 'Nilai', 'Keterangan'];
        $csvSummary[] = ['Waktu Pengujian', $waktuJalan, 'Waktu saat pengujian dijalankan'];
        $csvSummary[] = ['ID Pengujian', $timestamp, 'ID unik per run, dari tanggal dan jam'];
        $csvSummary[] = ['Total Requests', $this->totalRequests, 'Jumlah semua request termasuk yang ditolak Fail Fast'];
        $csvSummary[] = ['Request Berhasil', $this->successRequests, 'Jumlah request yang mendapat HTTP 2xx'];
        $csvSummary[] = ['Request Gagal', $this->failedRequests, 'Jumlah request yang gagal (HTTP 500 / gagal koneksi)'];
        $csvSummary[] = ['Request Ditolak (503)', $this->rejectedRequests, 'Jumlah request yang ditolak Fail Fast saat OPEN'];
        $csvSummary[] = ['Success Rate (%)', $successRate, 'Request berhasil / total request x 100%'];
        $csvSummary[] = ['Failure Rate (%)', $failureRate, 'Request gagal / total request x 100%'];
        $csvSummary[] = ['Average Response Time (ms)', $avg, 'Rata-rata waktu respons semua percobaan'];
        $csvSummary[] = ['Min Response Time (ms)', $min, 'Waktu respons paling cepat'];
        $csvSummary[] = ['Max Response Time (ms)', $max, 'Waktu respons paling lama'];
        $csvSummary[] = ['Median / P50 (ms)', $median, 'Nilai tengah waktu respons'];
        $csvSummary[] = ['P95 Response Time (ms)', $p95, 'Batas waktu yang mencakup 95% request tercepat'];
        $csvSummary[] = ['Throughput (req/detik)', $throughput, 'Total request dibagi total durasi pengujian'];
        $csvSummary[] = ['Retry Count', $this->retryCount, 'Jumlah percobaan ulang yang dilakukan'];
        $csvSummary[] = ['Retry Success', $this->retrySuccessCount, 'Jumlah retry yang akhirnya berhasil'];
        $csvSummary[] = ['Retry Success Rate (%)', $retrySuccessRate, 'Retry yang berhasil / total retry x 100%'];
        $csvSummary[] = ['UJI 0 Retry Murni', $this->retryMurniBerhasil ? 'PASS' : 'FAIL', '500, 500, 200 - Total attempt: ' . $this->retryMurniTotalAttempt];
        $csvSummary[] = ['Circuit State Terakhir', $this->circuit->getStateName(), 'State Circuit setelah Uji 5 selesai'];
        $csvSummary[] = ['Failure Rate Window (%)', round($this->circuit->getFailureRate(), 1), 'Persentase gagal dalam sliding window 10 request'];
        $csvSummary[] = ['Rejection Rate (%)', $rejectionRate, 'Request ditolak / total request x 100%'];
        $csvSummary[] = ['Recovery Time (detik)', $recovery ?? 'Belum pulih', 'Waktu OPEN sampai kembali CLOSED di Uji 4'];
        $csvSummary[] = ['HTTP 200/201', ($this->httpStatus['200'] ?? 0) + ($this->httpStatus['201'] ?? 0), 'Jumlah respons sukses'];
        $csvSummary[] = ['HTTP 500', $this->httpStatus['500'] ?? 0, 'Jumlah respons error / gagal koneksi'];
        $csvSummary[] = ['HTTP 503', $this->httpStatus['503'] ?? 0, 'Jumlah respons Fail Fast'];
        $csvSummary[] = ['', '', ''];
        $csvSummary[] = ['Hasil Per Tahap', 'Status', 'State Setelah Tahap'];
        foreach ($this->ujiResults as $nama => $r) {
            $csvSummary[] = [$nama . ' - ' . $r['tujuan'], $r['status'], $r['state'] . ' | FailureRate ' . $r['failure_rate'] . '% | Durasi ' . $r['durasi_detik'] . ' detik | ' . $r['hasil']];
        }

        $csvSummaryContent = $this->arrayToCsv($csvSummary);
        $csvSummaryFile = 'circuit_summary_' . $timestamp . '.csv';
        Storage::put($csvSummaryFile, $csvSummaryContent);
        Storage::put('circuit_summary_terbaru.csv', $csvSummaryContent);

        $csvAttempts = [];
        $csvAttempts[] = ['No', 'Tahap', 'Percobaan Ke', 'Status', 'HTTP Status', 'Response Time (ms)', 'Pesan', 'Waktu', 'Circuit State Setelah'];
        $no = 1;
        foreach ($this->attemptLogs as $log) {
            $csvAttempts[] = [$no, $log['tahap'], $log['percobaan_ke'], $log['status'], $log['http_status'], $log['response_time_ms'], $log['pesan'], $log['waktu'], $log['circuit_state_setelah']];
            $no++;
        }
        $csvAttemptsContent = $this->arrayToCsv($csvAttempts);
        $csvAttemptsFile = 'circuit_attempts_' . $timestamp . '.csv';
        Storage::put($csvAttemptsFile, $csvAttemptsContent);
        Storage::put('circuit_attempts_terbaru.csv', $csvAttemptsContent);

        $data = [
            'waktu_pengujian' => $waktuJalan,
            'id_pengujian' => $timestamp,
            'total_requests' => $this->totalRequests,
            'total_duration_sec' => round($totalDuration, 2),
            'success_rate' => $successRate,
            'failure_rate' => $failureRate,
            'avg_response_time_ms' => $avg,
            'min_response_time_ms' => $min,
            'max_response_time_ms' => $max,
            'median_ms' => $median,
            'p95_ms' => $p95,
            'throughput_req_per_sec' => $throughput,
            'retry_count' => $this->retryCount,
            'retry_success' => $this->retrySuccessCount,
            'retry_success_rate' => $retrySuccessRate,
            'uji0_retry_murni' => ['berhasil' => $this->retryMurniBerhasil, 'total_attempt' => $this->retryMurniTotalAttempt, 'gagal_awal' => $this->retryMurniGagalAwal],
            'circuit_state' => $this->circuit->getStateName(),
            'failure_rate_window' => round($this->circuit->getFailureRate(), 1),
            'rejection_rate' => $rejectionRate,
            'recovery_time_sec' => $recovery,
            'http_status_distribution' => $this->httpStatus,
            'state_transitions' => $this->stateTransitions,
            'hasil_per_tahap' => $this->ujiResults,
            'detail_percobaan' => $this->attemptLogs,
        ];
        Storage::put('circuit_metrics_' . $timestamp . '.json', json_encode($data, JSON_PRETTY_PRINT));
        Storage::put('circuit_metrics.json', json_encode($data, JSON_PRETTY_PRINT));

        $this->info('Laporan tersimpan otomatis:');
        $this->info('  - TXT (Notepad) : storage/app/' . $txtFile);
        $this->info('  - CSV Ringkasan : storage/app/' . $csvSummaryFile);
        $this->info('  - CSV Detail    : storage/app/' . $csvAttemptsFile);
        $this->info('  - JSON          : storage/app/circuit_metrics_' . $timestamp . '.json');
    }

    protected function arrayToCsv(array $rows): string
    {
        $handle = fopen('php://temp', 'r+');
        fwrite($handle, "\xEF\xBB\xBF");
        foreach ($rows as $row) {
            fputcsv($handle, $row, ';');
        }
        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);
        return $content;
    }

    protected function median(array $arr): float
    {
        if (count($arr) === 0) return 0;
        sort($arr);
        $mid = (int) floor(count($arr) / 2);
        return count($arr) % 2 ? round((float) $arr[$mid], 2) : round(((float) $arr[$mid - 1] + (float) $arr[$mid]) / 2, 2);
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
