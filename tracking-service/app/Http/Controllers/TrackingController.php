<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tracking;
use App\Models\SosReport;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class TrackingController extends Controller
{
    // Dipanggil dari Gate setelah check-in di Gate valid
    // Bukan check-in kedua, ini aktivasi tracking + lokasi pertama Basecamp
    public function checkIn(Request $request)
    {
        $request->validate([
            'ticket_code' => 'required|string',
            'booking_id' => 'nullable|integer',
            'latitude' => 'nullable|string',
            'longitude' => 'nullable|string',
            'location_name' => 'nullable|string',
            'location_note' => 'nullable|string',
        ]);

        // Kalau sudah ada, jangan duplikat, balikin yang lama
        $existing = Tracking::where('ticket_code', $request->ticket_code)->first();
        if ($existing) {
            return response()->json([
                'success' => true,
                'message' => 'Tracking sudah ada.',
                'data' => $existing,
            ], 200);
        }

        $bookingId = $request->booking_id;

        // Kalau Gate tidak ngirim booking_id, baru validasi ke Gate untuk ambil booking_id
        // Kalau Gate sudah ngirim, langsung pakai, tidak perlu manggil Gate lagi biar tidak muter
        if (!$bookingId) {
            try {
                $gateResponse = Http::timeout(3)->post('http://127.0.0.1:8004/api/tickets/validate', [
                    'ticket_code' => $request->ticket_code,
                ]);
                $gateData = $gateResponse->json();
                if (!($gateData['success'] ?? false)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Tiket tidak valid: ' . ($gateData['message'] ?? 'Ditolak Gate'),
                    ], 400);
                }
                $bookingId = $gateData['data']['booking_id'] ?? null;
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gate Service tidak dapat dihubungi: ' . $e->getMessage(),
                ], 503);
            }
        }

        if (!$bookingId) {
            return response()->json(['success' => false, 'message' => 'booking_id tidak ditemukan.'], 400);
        }

        // Lokasi pertama HARUS Basecamp, bukan kosong
        $tracking = Tracking::create([
            'booking_id' => $bookingId,
            'ticket_code' => $request->ticket_code,
            'status' => 'CHECKED_IN',
            'checked_in_at' => Carbon::now(),
            'last_latitude' => $request->latitude ?? '-7.4512',
            'last_longitude' => $request->longitude ?? '110.4213',
            'last_location_note' => $request->location_name ?? $request->location_note ?? 'Basecamp Selo - Check-in',
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

        // Tidak manggil Gate lagi, Gate yang manggil ke sini. Biar tidak muter.
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
            'location_name' => 'nullable|string',
        ]);

        $tracking = Tracking::where('ticket_code', $request->ticket_code)->first();

        if (!$tracking) {
            return response()->json(['success' => false, 'message' => 'Data tracking tidak ditemukan.'], 404);
        }

        // Terima location_name dan location_note dua-duanya, biar Postman yang kirim location_name tetap masuk
        $note = $request->location_note ?? $request->location_name ?? $tracking->last_location_note;

        $tracking->update([
            'status' => 'ON_TRACK',
            'last_latitude' => $request->latitude ?? $tracking->last_latitude,
            'last_longitude' => $request->longitude ?? $tracking->last_longitude,
            'last_location_note' => $note,
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