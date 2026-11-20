<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tracking;
use App\Models\SosReport;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class TrackingController extends Controller
{
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

        $bookingId = $request->booking_id;
        if (!$bookingId) {
            try {
                $gateResponse = Http::timeout(3)->post('http://127.0.0.1:8004/api/tickets/validate', ['ticket_code' => $request->ticket_code]);
                $gateData = $gateResponse->json();
                if (!($gateData['success'] ?? false)) {
                    return response()->json(['success' => false, 'message' => 'Tiket tidak valid: ' . ($gateData['message'] ?? 'Ditolak Gate')], 400);
                }
                $bookingId = $gateData['data']['booking_id'] ?? null;
            } catch (\Exception $e) {
                return response()->json(['success' => false, 'message' => 'Gate Service tidak dapat dihubungi: ' . $e->getMessage()], 503);
            }
        }
        if (!$bookingId) {
            return response()->json(['success' => false, 'message' => 'booking_id tidak ditemukan.'], 400);
        }

        $members = [];
        try {
            $bookingResponse = Http::timeout(3)->get('http://127.0.0.1:8001/api/bookings/' . $bookingId . '/internal');
            $bookingData = $bookingResponse->json();
            $members = $bookingData['data']['members'] ?? [];
        } catch (\Throwable $e) {
            $members = [];
        }

        if (empty($members)) {
            $members = [['hiker_code' => $request->ticket_code . '-1', 'name' => 'Pendaki 1']];
        }

        $created = [];
        foreach ($members as $index => $member) {
            $hikerCode = $member['hiker_code'] ?? ($request->ticket_code . '-' . ($index + 1));
            $memberName = $member['name'] ?? ('Pendaki ' . ($index + 1));
            $gelangId = $request->ticket_code . '-' . $hikerCode;

            $existing = Tracking::where('ticket_code', $request->ticket_code)->where('hiker_code', $hikerCode)->first();
            if ($existing) {
                $created[] = $existing;
                continue;
            }

            $created[] = Tracking::create([
                'booking_id' => $bookingId,
                'ticket_code' => $request->ticket_code,
                'hiker_code' => $hikerCode,
                'member_name' => $memberName,
                'gelang_id' => $gelangId,
                'status' => 'CHECKED_IN',
                'checked_in_at' => Carbon::now(),
                'last_latitude' => $request->latitude ?? '-7.4512',
                'last_longitude' => $request->longitude ?? '110.4213',
                'last_location_note' => $request->location_name ?? $request->location_note ?? 'Basecamp Selo - Check-in',
            ]);
        }

        return response()->json(['success' => true, 'message' => 'Check-in berhasil. ' . count($created) . ' gelang ter-pairing.', 'data' => $created], 201);
    }

    public function checkOut(Request $request)
    {
        $request->validate(['ticket_code' => 'required|string']);
        $trackings = Tracking::where('ticket_code', $request->ticket_code)->get();
        if ($trackings->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'Data tracking tidak ditemukan.'], 404);
        }
        foreach ($trackings as $tracking) {
            if (in_array($tracking->status, ['CHECKED_IN', 'ON_TRACK', 'EMERGENCY'])) {
                $tracking->update(['status' => 'CHECKED_OUT', 'checked_out_at' => Carbon::now()]);
            }
        }
        return response()->json(['success' => true, 'message' => 'Check-out berhasil. Pendakian selesai.', 'data' => $trackings], 200);
    }

    public function updateLocation(Request $request)
    {
        $request->validate([
            'ticket_code' => 'required|string',
            'hiker_code' => 'nullable|string',
            'gelang_id' => 'nullable|string',
            'latitude' => 'nullable|string',
            'longitude' => 'nullable|string',
            'location_note' => 'nullable|string',
            'location_name' => 'nullable|string',
        ]);
        $query = Tracking::where('ticket_code', $request->ticket_code);
        if ($request->hiker_code) $query->where('hiker_code', $request->hiker_code);
        elseif ($request->gelang_id) $query->where('gelang_id', $request->gelang_id);
        $trackings = $query->get();
        if ($trackings->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'Data tracking tidak ditemukan.'], 404);
        }
        if ($trackings->count() > 1 && !$request->hiker_code && !$request->gelang_id) {
            return response()->json(['success' => false, 'message' => 'Ada ' . $trackings->count() . ' gelang. Kirim hiker_code untuk update lokasi per anggota.', 'data' => $trackings], 422);
        }
        $tracking = $trackings->first();
        $note = $request->location_note ?? $request->location_name ?? $tracking->last_location_note;
        $tracking->update(['status' => 'ON_TRACK', 'last_latitude' => $request->latitude ?? $tracking->last_latitude, 'last_longitude' => $request->longitude ?? $tracking->last_longitude, 'last_location_note' => $note]);
        return response()->json(['success' => true, 'message' => 'Lokasi berhasil diperbarui.', 'data' => $tracking], 200);
    }

    public function sendSos(Request $request)
    {
        $request->validate([
            'ticket_code' => 'required|string',
            'hiker_code' => 'nullable|string',
            'gelang_id' => 'nullable|string',
            'latitude' => 'nullable|string',
            'longitude' => 'nullable|string',
            'message' => 'nullable|string',
        ]);
        $query = Tracking::where('ticket_code', $request->ticket_code);
        if ($request->hiker_code) $query->where('hiker_code', $request->hiker_code);
        elseif ($request->gelang_id) $query->where('gelang_id', $request->gelang_id);
        $trackings = $query->get();
        if ($trackings->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'Data tracking tidak ditemukan.'], 404);
        }
        if ($trackings->count() > 1 && !$request->hiker_code && !$request->gelang_id) {
            return response()->json(['success' => false, 'message' => 'Ada ' . $trackings->count() . ' gelang. Kirim hiker_code untuk SOS per anggota.'], 422);
        }
        $tracking = $trackings->first();
        $sos = SosReport::create([
            'booking_id' => $tracking->booking_id,
            'ticket_code' => $request->ticket_code,
            'hiker_code' => $tracking->hiker_code,
            'member_name' => $tracking->member_name,
            'gelang_id' => $tracking->gelang_id,
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
        $trackings = Tracking::where('ticket_code', $ticketCode)->get();
        if ($trackings->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'Data tracking tidak ditemukan.'], 404);
        }
        return response()->json(['success' => true, 'message' => 'Ditemukan ' . $trackings->count() . ' gelang untuk tiket ini.', 'data' => $trackings], 200);
    }

    public function getSosList()
    {
        $sos = SosReport::where('status', 'ACTIVE')->orderBy('created_at', 'desc')->get();
        return response()->json(['success' => true, 'data' => $sos], 200);
    }
}
