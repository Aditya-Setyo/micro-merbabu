<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Ticket;
use Illuminate\Support\Str;
use Carbon\Carbon;


class TicketController extends Controller
{
    // Dipanggil Payment Service setelah payVa berhasil
    // Endpoint ini sengaja tanpa auth user, karena ini jalur antar-service
    public function confirm(Request $request)
    {
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

        return response()->json(['success' => true, 'message' => 'Check-out berhasil.', 'data' => $ticket], 200);
    }
}
