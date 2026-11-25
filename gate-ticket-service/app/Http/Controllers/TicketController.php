<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Ticket;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TicketController extends Controller
{

    public function confirm(Request $request)
    {
        // Fault Injection - SEKARANG 30% ACAK, BUKAN 100% PERMANEN
        $fault = Cache::get('fault_injection');

        if ($fault === 'latency') {
            // Cuma 30% request yang kena lambat, 70% lolos normal
            // Sleep 2 detik aja, jangan 5 detik, biar nggak kalah sama timeout Payment (3 detik)
            if (rand(1, 100) <= 30) {
                sleep(2);
            }
        }

        if ($fault === 'error') {
            // Cuma 30% yang dibalikin 500, 70% lolos normal
            // Di sinilah Retry bisa nyelametin
            if (rand(1, 100) <= 30) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fault Injection: HTTP 500 Internal Server Error (30%)',
                ], 500);
            }
            // Kalau nggak kena undian 30%, lanjut ke bawah normal
        }

        $request->validate([
            'booking_id' => 'required|integer',
            'payment_id' => 'required|integer',
            'status' => 'required|string',
        ]);

        // Kalau tiket sudah pernah dibuat, jangan duplikat
        $existing = Ticket::where('booking_id', $request->booking_id)->first();
        if ($existing) {
            return response()->json([
                'success' => true,
                'message' => 'Tiket sudah pernah diterbitkan.',
                'data' => $existing
            ], 200);
        }

        $ticketCode = 'TKT-' . Str::upper(Str::random(8));

        $ticket = Ticket::create([
            'booking_id' => $request->booking_id,
            'payment_id' => $request->payment_id,
            'ticket_code' => $ticketCode,
            'booking_code' => $request->booking_code ?? null,
            'status' => 'ACTIVE',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tiket berhasil diterbitkan.',
            'data' => $ticket
        ], 201);
    }
    // Dipanggil Payment Service setelah payVa berhasil
    // // Endpoint ini sengaja tanpa auth user, karena ini jalur antar-service
    // public function confirm(Request $request)
    // {
    //     // Fault Injection latency 5 detik dan HTTP 500
    //     $fault = Cache::get('fault_injection');
    //     if ($fault === 'latency') {
    //         sleep(5); // Artificial Latency 5 detik
    //     }
    //     if ($fault === 'error') {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Fault Injection: HTTP 500 Internal Server Error',
    //         ], 500);
    //     }

    //     $request->validate([
    //         'booking_id' => 'required|integer',
    //         'payment_id' => 'required|integer',
    //         'status' => 'required|string',
    //     ]);

    //     // Kalau tiket sudah pernah dibuat, jangan duplikat
    //     $existing = Ticket::where('booking_id', $request->booking_id)->first();
    //     if ($existing) {
    //         return response()->json([
    //             'success' => true,
    //             'message' => 'Tiket sudah pernah diterbitkan.',
    //             'data' => $existing
    //         ], 200);
    //     }

    //     $ticketCode = 'TKT-' . Str::upper(Str::random(8));

    //     $ticket = Ticket::create([
    //         'booking_id' => $request->booking_id,
    //         'payment_id' => $request->payment_id,
    //         'ticket_code' => $ticketCode,
    //         'booking_code' => $request->booking_code ?? null,
    //         'status' => 'ACTIVE',
    //     ]);

    //     return response()->json([
    //         'success' => true,
    //         'message' => 'Tiket berhasil diterbitkan.',
    //         'data' => $ticket
    //     ], 201);
    // }

    // Dipakai Petugas Basecamp untuk validasi, sesuai sequence diagram check-in
    public function validateTicket(Request $request)
    {
        $request->validate([
            'ticket_code' => 'required|string',
        ]);

        $ticket = Ticket::where('ticket_code', $request->ticket_code)->first();

        if (!$ticket) {
            return response()->json([
                'success' => false,
                'message' => 'Tiket tidak ditemukan.'
            ], 404);
        }

        if ($ticket->status !== 'ACTIVE') {
            return response()->json([
                'success' => false,
                'message' => "Tiket tidak valid. Status saat ini: {$ticket->status}",
                'data' => $ticket
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Tiket valid.',
            'data' => $ticket
        ], 200);
    }

    public function checkIn(Request $request)
    {
        $request->validate([
            'ticket_code' => 'required|string',
        ]);

        $ticket = Ticket::where('ticket_code', $request->ticket_code)->first();

        if (!$ticket) {
            return response()->json(['success' => false, 'message' => 'Tiket tidak ditemukan.'], 404);
        }

        if ($ticket->status !== 'ACTIVE') {
            return response()->json(['success' => false, 'message' => "Tiket tidak bisa check-in. Status: {$ticket->status}"], 400);
        }

        $ticket->update([
            'status' => 'CHECKED_IN',
            'checked_in_at' => Carbon::now(),
        ]);

        // KIRIM DATA YANG SAMA KE TRACKING + LOKASI PERTAMA BASECAMP
        // Ini yang awal kamu bilang: check-in valid di Gate, data dikirim ke Tracking
        try {
            $trackingResponse = Http::timeout(5)->post(
                env('TRACKING_SERVICE_URL', 'http://127.0.0.1:8003') . '/api/tracking/check-in',
                [
                    'booking_id' => $ticket->booking_id,
                    'ticket_code' => $ticket->ticket_code,
                    'latitude' => '-7.4512',
                    'longitude' => '110.4213',
                    'location_name' => 'Basecamp Selo - Check-in',
                ]
            );

            if ($trackingResponse->failed()) {
                Log::warning('Tracking gagal untuk tiket ' . $ticket->ticket_code . ': ' . $trackingResponse->body());
            }
        } catch (\Throwable $e) {
            Log::warning('Gagal buat tracking otomatis untuk tiket ' . $ticket->ticket_code . ': ' . $e->getMessage());
        }

        return response()->json(['success' => true, 'message' => 'Check-in berhasil.', 'data' => $ticket], 200);
    }

    public function checkOut(Request $request)
    {
        $request->validate([
            'ticket_code' => 'required|string',
        ]);

        $ticket = Ticket::where('ticket_code', $request->ticket_code)->first();

        if (!$ticket) {
            return response()->json(['success' => false, 'message' => 'Tiket tidak ditemukan.'], 404);
        }

        if ($ticket->status !== 'CHECKED_IN') {
            return response()->json(['success' => false, 'message' => "Tiket tidak bisa check-out. Status: {$ticket->status}"], 400);
        }

        $ticket->update([
            'status' => 'CHECKED_OUT',
            'checked_out_at' => Carbon::now(),
        ]);

        // Kasih tahu Tracking juga, biar tracking ikut CHECKED_OUT
        try {
            Http::timeout(3)->post(
                env('TRACKING_SERVICE_URL', 'http://127.0.0.1:8003') . '/api/tracking/check-out',
                [
                    'ticket_code' => $ticket->ticket_code,
                ]
            );
        } catch (\Throwable $e) {
            Log::warning('Gagal update tracking check-out untuk ' . $ticket->ticket_code . ': ' . $e->getMessage());
        }

        return response()->json(['success' => true, 'message' => 'Check-out berhasil.', 'data' => $ticket], 200);
    }
}
