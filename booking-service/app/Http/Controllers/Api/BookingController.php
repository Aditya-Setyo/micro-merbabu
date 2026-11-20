<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingMember;
use App\Models\DailyQuota;
use App\Models\HikingRoute;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BookingController extends Controller
{
    public function index(Request $request)
    {
        $bookings = Booking::with(['hikingRoute', 'members'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();
        return response()->json(['success' => true, 'data' => $bookings]);
    }

    /**
     * Ketua cuma kirim ID_Code anggota saja.
     * Ketua tidak perlu kirim ID_Code-nya sendiri, sudah dari login.
     * Minimal yang diketik: 2 ID_Code -> total 3 sama ketua.
     * Maksimal: terserah, tidak ada max.
     */
    public function lookupMembers(Request $request)
    {
        $leader = $request->user();

        $validated = $request->validate([
            'member_id_codes' => 'required|array|min:2',
            'member_id_codes.*' => 'required|string',
        ]);

        if (count($validated['member_id_codes']) !== count(array_unique($validated['member_id_codes']))) {
            return response()->json(['success' => false, 'message' => 'ID_Code anggota tidak boleh duplikat.'], 422);
        }

        if (in_array($leader->id_code, $validated['member_id_codes'])) {
            return response()->json(['success' => false, 'message' => 'Tidak perlu memasukkan ID_Code ketua, ketua sudah otomatis dari akun login.'], 422);
        }

        $members = [];
        $notFound = [];

        foreach ($validated['member_id_codes'] as $idCode) {
            $user = User::where('id_code', $idCode)->first();
            if (!$user) {
                $notFound[] = $idCode;
                continue;
            }
            $members[] = $this->formatUserAsMember($user, false);
        }

        if (!empty($notFound)) {
            return response()->json(['success' => false, 'message' => 'ID_Code tidak ditemukan: ' . implode(', ', $notFound), 'not_found' => $notFound], 404);
        }

        $leaderData = $this->formatUserAsMember($leader, true);

        return response()->json([
            'success' => true,
            'message' => 'Ditemukan ' . count($members) . ' anggota. Total rombongan ' . (count($members) + 1) . ' orang termasuk ketua.',
            'data' => [
                'leader' => $leaderData,
                'members' => $members,
                'total_count' => count($members) + 1,
            ],
        ]);
    }

    /**
     * Ubah data users (pendaftaran) jadi format BookingMember.
     * Ini yang bikin "data pendaftaran tampil lengkap" itu kejadian.
     */
    private function formatUserAsMember(User $user, bool $isLeader)
    {
        $fullAddress = trim($user->address . ', ' . $user->village . ', ' . $user->district . ', ' . $user->city . ', ' . $user->province, ', ');

        return [
            'id_code' => $user->id_code,
            'user_id' => $user->id,
            'name' => $user->name,
            'identity_type' => $user->identity_type ?? 'KTP',
            'nik' => $user->nik,
            'nationality' => 'Indonesia',
            'address' => $fullAddress,
            'age' => $user->birth_date ? Carbon::parse($user->birth_date)->age : null,
            'birth_date' => $user->birth_date,
            'weight' => $user->weight,
            'phone' => $user->phone,
            'is_leader' => $isLeader,
        ];
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->verification_status !== 'VERIFIED') {
            return response()->json(['success' => false, 'message' => 'Akun belum diverifikasi petugas.'], 403);
        }

        $validated = $request->validate([
            'hiking_route_id' => 'required|integer|exists:hiking_routes,id',
            'return_route_id' => 'nullable|integer|exists:hiking_routes,id',
            'booking_date' => 'required|date_format:Y-m-d|after_or_equal:today',
            'duration_days' => 'required|integer|min:1|max:14',
            'member_id_codes' => 'required|array|min:2',
            'member_id_codes.*' => 'required|string',
        ]);

        if (count($validated['member_id_codes']) !== count(array_unique($validated['member_id_codes']))) {
            throw ValidationException::withMessages(['member_id_codes' => ['ID_Code anggota tidak boleh duplikat.']]);
        }

        if (in_array($user->id_code, $validated['member_id_codes'])) {
            throw ValidationException::withMessages(['member_id_codes' => ['Tidak perlu memasukkan ID_Code ketua, ketua sudah otomatis dari akun login.']]);
        }

        $memberUsers = User::whereIn('id_code', $validated['member_id_codes'])->get();
        if ($memberUsers->count() !== count($validated['member_id_codes'])) {
            $foundCodes = $memberUsers->pluck('id_code')->toArray();
            $notFound = array_diff($validated['member_id_codes'], $foundCodes);
            throw ValidationException::withMessages(['member_id_codes' => ['ID_Code tidak ditemukan: ' . implode(', ', $notFound)]]);
        }

        foreach ($memberUsers as $m) {
            if ($m->verification_status !== 'VERIFIED') {
                return response()->json(['success' => false, 'message' => "Anggota {$m->name} ({$m->id_code}) belum diverifikasi petugas."], 403);
            }
        }

        $route = HikingRoute::where('is_active', true)->find($validated['hiking_route_id']);
        if (!$route) {
            return response()->json(['success' => false, 'message' => 'Jalur pendakian sedang tidak tersedia.'], 422);
        }

        if (!empty($validated['return_route_id'])) {
            $returnRoute = HikingRoute::where('is_active', true)->find($validated['return_route_id']);
            if (!$returnRoute) {
                return response()->json(['success' => false, 'message' => 'Jalur kembali tidak tersedia.'], 422);
            }
        }

        // Total = 1 ketua + N anggota
        $memberCount = 1 + $memberUsers->count();
        $ticketPrice = (float) $route->ticket_price;
        $totalPrice = $ticketPrice * $memberCount * $validated['duration_days'];

        $allMembersData = [];
        $allMembersData[] = $this->formatUserAsMember($user, true);
        foreach ($memberUsers as $m) {
            $allMembersData[] = $this->formatUserAsMember($m, false);
        }

        try {
            $booking = DB::transaction(function () use ($validated, $route, $user, $memberCount, $ticketPrice, $totalPrice, $allMembersData) {
                $now = now();

                DB::table('daily_quotas')->insertOrIgnore([
                    'hiking_route_id' => $route->id,
                    'booking_date' => $validated['booking_date'],
                    'quota_total' => 300,
                    'quota_used' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $quota = DailyQuota::where('hiking_route_id', $route->id)
                    ->where('booking_date', $validated['booking_date'])
                    ->lockForUpdate()
                    ->firstOrFail();

                $remaining = $quota->quota_total - $quota->quota_used;
                if ($remaining < $memberCount) {
                    throw ValidationException::withMessages(['member_id_codes' => ["Kuota tidak mencukupi. Sisa kuota: {$remaining} orang."]]);
                }

                $booking = Booking::create([
                    'booking_code' => 'MRB-' . Str::upper(Str::random(10)),
                    'user_id' => $user->id,
                    'hiking_route_id' => $route->id,
                    'return_route_id' => $validated['return_route_id'] ?? null,
                    'booking_date' => $validated['booking_date'],
                    'duration_days' => $validated['duration_days'],
                    'member_count' => $memberCount,
                    'ticket_price' => $ticketPrice,
                    'total_price' => $totalPrice,
                    'status' => 'PENDING_PAYMENT',
                    'expires_at' => now()->addMinutes(15),
                ]);

                foreach ($allMembersData as $member) {
                    BookingMember::create([
                        'booking_id' => $booking->id,
                        'hiker_code' => 'HIK-' . Str::upper(Str::random(8)),
                        'name' => $member['name'],
                        'identity_type' => $member['identity_type'],
                        'nik' => $member['nik'],
                        'nationality' => $member['nationality'],
                        'address' => $member['address'],
                        'age' => $member['age'],
                        'weight' => $member['weight'],
                        'phone' => $member['phone'],
                        'is_leader' => $member['is_leader'],
                    ]);
                }

                $quota->increment('quota_used', $memberCount);

                return $booking;
            }, 3);

            return response()->json([
                'success' => true,
                'message' => 'Booking berhasil dibuat. Silakan lanjutkan pembayaran.',
                'data' => $booking->load(['hikingRoute', 'members']),
            ], 201);
        } catch (ValidationException $e) {
            throw $e;
        }
    }

    public function show(Request $request, $id)
    {
        $booking = Booking::with(['hikingRoute', 'returnRoute', 'members'])
            ->where('user_id', $request->user()->id)
            ->find($id);
        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Data booking tidak ditemukan.'], 404);
        }
        return response()->json(['success' => true, 'data' => $booking]);
    }

    /**
     * Untuk Tracking: ambil booking + members tanpa auth.
     */
    public function showInternal($id)
    {
        $booking = Booking::with('members')->find($id);
        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking tidak ditemukan'], 404);
        }
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $booking->id,
                'booking_code' => $booking->booking_code,
                'member_count' => $booking->member_count,
                'members' => $booking->members,
            ],
        ]);
    }
}
