<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Booking;
use App\Models\DailyQuota;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ExpireBookings extends Command
{
    protected $signature = 'bookings:expire';

    protected $description =
        'Mengubah booking kedaluwarsa dan mengembalikan kuota pendakian';

    public function handle(): int
    {
        $expiredIds = Booking::where('status', 'PENDING_PAYMENT')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->orderBy('id')
            ->pluck('id');

        $count = 0;

        foreach ($expiredIds as $id) {
            $wasExpired = DB::transaction(function () use ($id) {
                // Kunci booking agar tidak diproses bersamaan.
                $booking = Booking::whereKey($id)
                    ->lockForUpdate()
                    ->first();

                if (
                    !$booking ||
                    $booking->status !== 'PENDING_PAYMENT' ||
                    !$booking->expires_at ||
                    $booking->expires_at->isFuture()
                ) {
                    return false;
                }

                // Kunci kuota untuk mencegah perubahan bersamaan.
                $quota = DailyQuota::where(
                    'hiking_route_id',
                    $booking->hiking_route_id
                )
                    ->whereDate('booking_date', $booking->booking_date)
                    ->lockForUpdate()
                    ->first();

                if (!$quota) {
                    throw new RuntimeException(
                        "Data kuota tidak ditemukan untuk booking {$booking->id}"
                    );
                }

                // Kurangi penggunaan kuota satu kali.
                $quota->quota_used = max(
                    0,
                    $quota->quota_used - $booking->member_count
                );

                $quota->save();

                // Ubah status dalam transaksi yang sama.
                $booking->status = 'EXPIRED';
                $booking->save();

                return true;
            }, 3);

            if ($wasExpired) {
                $count++;
            }
        }

        $this->info(
            "Proses selesai. {$count} booking berhasil kedaluwarsa."
        );

        return self::SUCCESS;
    }
}
