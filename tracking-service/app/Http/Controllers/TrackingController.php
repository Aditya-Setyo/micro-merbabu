<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tracking;
use App\Models\SosReport;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;


class TrackingController extends Controller
{
    // Petugas check-in, validasi dulu ke Gate 8004
    public function checkIn(Request $request)
    {
        $request->validate([
            'ticket_code' => 'required|string',
        ]);

        // 1. Validasi ke Gate
        try {
            $gateResponse = Http::timeout(3)->post('http://127.0.0.1:8004/api/tickets/validate', [
                'ticket_code' => $request->ticket_code,
            ]);
            $gateData = $gateResponse->json();
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gate Service tidak dapat dihubungi: ' . $e->getMessage(),
            ], 503);
        }

        if (!($gateData['success'] ?? false)) {
            return response()->json([
                'success' => false,
                'message' => 'Tiket tidak valid: ' . ($gateData['message'] ?? 'Ditolak Gate'),
            ], 400);
        }

        // 2. Cek sudah check-in atau belum
        $existing = Tracking::where('ticket_code', $request->ticket_code)->first();
        if ($existing && in_array($existing->status, ['CHECKED_IN', 'ON_TRACK', 'EMERGENCY'])) {
            return response()->json([
                'success' => false,
                'message' => 'Tiket ini sudah check-in.',
                'data' => $existing,
            ], 400);
        }

        // 3. Update status di Gate jadi CHECKED_IN juga
        try {
            Http::timeout(3)->post('http://127.0.0.1:8004/api/tickets/check-in', [
                'ticket_code' => $request->ticket_code,
            ]);
        } catch (\Exception $e) {
            // Tetap lanjut, yang penting tracking tersimpan
        }

        $tracking = Tracking::create([
            'booking_id' => $gateData['data']['booking_id'],
            'ticket_code' => $request->ticket_code,
            'status' => 'CHECKED_IN',
            'checked_in_at' => Carbon::now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Check-in berhasil. Pendaki diizinkan mendaki.',
            'data' => $tracking,
        ], 201);
    }

    public function checkOut(Request $request)
    {
        $request->validate([
            'ticket_code' => 'required|string',
        ]);

        $tracking = Tracking::where('ticket_code', $request->ticket_code)->first();

        if (!$tracking) {
            return response()->json(['success' => false, 'message' => 'Data tracking tidak ditemukan.'], 404);
        }

        if (!in_array($tracking->status, ['CHECKED_IN', 'ON_TRACK', 'EMERGENCY'])) {
            return response()->json(['success' => false, 'message' => "Tidak bisa check-out. Status: {$tracking->status}"], 400);
        }

        // Update Gate juga
        try {
            Http::timeout(3)->post('http://127.0.0.1:8004/api/tickets/check-out', [
                'ticket_code' => $request->ticket_code,
            ]);
        } catch (\Exception $e) {
            // Lanjut saja
        }

        $tracking->update([
            'status' => 'CHECKED_OUT',
            'checked_out_at' => Carbon::now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Check-out berhasil. Pendakian selesai.', 'data' => $tracking], 200);
    }

    // Pendaki update lokasi / aktivitas
    public function updateLocation(Request $request)
    {
        $request->validate([
            'ticket_code' => 'required|string',
            'latitude' => 'nullable|string',
            'longitude' => 'nullable|string',
            'location_note' => 'nullable|string',
        ]);

        $tracking = Tracking::where('ticket_code', $request->ticket_code)->first();

        if (!$tracking) {
            return response()->json(['success' => false, 'message' => 'Data tracking tidak ditemukan.'], 404);
        }

        $tracking->update([
            'status' => 'ON_TRACK',
            'last_latitude' => $request->latitude,
            'last_longitude' => $request->longitude,
            'last_location_note' => $request->location_note,
        ]);

        return response()->json(['success' => true, 'message' => 'Lokasi berhasil diperbarui.', 'data' => $tracking], 200);
    }

    // Emergency SOS, sesuai use case Mengirim Emergency SOS
    public function sendSos(Request $request)
    {
        $request->validate([
            'ticket_code' => 'required|string',
            'latitude' => 'nullable|string',
            'longitude' => 'nullable|string',
            'message' => 'nullable|string',
        ]);

        $tracking = Tracking::where('ticket_code', $request->ticket_code)->first();

        if (!$tracking) {
            return response()->json(['success' => false, 'message' => 'Data tracking tidak ditemukan.'], 404);
        }

        $sos = SosReport::create([
            'booking_id' => $tracking->booking_id,
            'ticket_code' => $request->ticket_code,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'message' => $request->message ?? 'Emergency SOS dari pendaki',
            'status' => 'ACTIVE',
        ]);

        $tracking->update(['status' => 'EMERGENCY']);

        return response()->json(['success' => true, 'message' => 'SOS terkirim. Petugas akan segera merespon.', 'data' => $sos], 201);
    }

    public function getStatus($ticketCode)
    {
        $tracking = Tracking::where('ticket_code', $ticketCode)->first();

        if (!$tracking) {
            return response()->json(['success' => false, 'message' => 'Data tracking tidak ditemukan.'], 404);
        }

        return response()->json(['success' => true, 'data' => $tracking], 200);
    }

    public function getSosList()
    {
        $sos = SosReport::where('status', 'ACTIVE')->orderBy('created_at', 'desc')->get();

        return response()->json(['success' => true, 'data' => $sos], 200);
    }
}
