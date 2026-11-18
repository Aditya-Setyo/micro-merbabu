<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingMember;
use App\Models\DailyQuota;
use App\Models\HikingRoute;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BookingController extends Controller
{
    /**
     * Menampilkan booking milik pendaki yang login.
     */
    public function index(Request $request)
    {
        $bookings = Booking::with(['hikingRoute', 'members'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $bookings,
        ]);
    }

    /**
     * Membuat booking pendakian.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->verification_status !== 'VERIFIED') {
            return response()->json([
                'success' => false,
                'message' => 'Akun belum diverifikasi petugas.',
            ], 403);
        }

        $validated = $request->validate([
            'hiking_route_id' => 'required|integer|exists:hiking_routes,id',

            'return_route_id' => 'nullable|integer|exists:hiking_routes,id',

            'booking_date' => 'required|date_format:Y-m-d|after_or_equal:today',

            'duration_days' => 'required|integer|min:1|max:14',

            'members' => 'required|array|min:3',

            'members.*.name' => 'required|string|max:255',

            'members.*.identity_type' => 'required|in:KTP,Passport',

            'members.*.nik' => [
                'required',
                'string',
                'max:30',
                'distinct',
            ],

            'members.*.nationality' => 'required|string|max:100',

            'members.*.address' => 'required|string|max:1000',

            'members.*.age' => 'required|integer|min:1|max:120',

            'members.*.weight' => 'required|numeric|min:1|max:300',

            'members.*.phone' => 'required|string|max:20',

            'members.*.is_leader' => 'required|boolean',
        ]);

        $leaderCount = collect($validated['members'])
            ->where('is_leader', true)
            ->count();

        if ($leaderCount !== 1) {
            throw ValidationException::withMessages([
                'members' => [
                    'Harus ada tepat satu ketua rombongan.',
                ],
            ]);
        }

        $leader = collect($validated['members'])
            ->firstWhere('is_leader', true);

        if (
            $leader['nik'] !== $user->nik ||
            mb_strtolower(trim($leader['name'])) !==
            mb_strtolower(trim($user->name))
        ) {
            throw ValidationException::withMessages([
                'members' => [
                    'Data ketua rombongan harus sesuai dengan akun pendaki yang login.',
                ],
            ]);
        }

        $route = HikingRoute::where('is_active', true)
            ->find($validated['hiking_route_id']);

        if (!$route) {
            return response()->json([
                'success' => false,
                'message' => 'Jalur pendakian sedang tidak tersedia.',
            ], 422);
        }

        if (!empty($validated['return_route_id'])) {
            $returnRoute = HikingRoute::where('is_active', true)
                ->find($validated['return_route_id']);

            if (!$returnRoute) {
                return response()->json([
                    'success' => false,
                    'message' => 'Jalur kembali tidak tersedia.',
                ], 422);
            }
        }

        $memberCount = count($validated['members']);
        $ticketPrice = (float) $route->ticket_price;
        $totalPrice = $ticketPrice * $memberCount *
            $validated['duration_days'];

        try {
            $booking = DB::transaction(function () use (
                $validated,
                $route,
                $user,
                $memberCount,
                $ticketPrice,
                $totalPrice
            ) {
                $now = now();

                /*
                 * Buat baris kuota jika belum tersedia.
                 * Unique index route + tanggal mencegah duplikasi.
                 */
                DB::table('daily_quotas')->insertOrIgnore([
                    'hiking_route_id' => $route->id,
                    'booking_date' => $validated['booking_date'],
                    'quota_total' => 300,
                    'quota_used' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                /*
                 * Kunci baris kuota sampai transaksi selesai.
                 */
                $quota = DailyQuota::where(
                    'hiking_route_id',
                    $route->id
                )
                    ->where(
                        'booking_date',
                        $validated['booking_date']
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

                $remaining = $quota->quota_total - $quota->quota_used;

                if ($remaining < $memberCount) {
                    throw ValidationException::withMessages([
                        'members' => [
                            "Kuota tidak mencukupi. Sisa kuota: {$remaining} orang.",
                        ],
                    ]);
                }

                $booking = Booking::create([
                    'booking_code' => 'MRB-' .
                        Str::upper(Str::random(10)),

                    'user_id' => $user->id,

                    'hiking_route_id' => $route->id,

                    'return_route_id' =>
                    $validated['return_route_id'] ?? null,

                    'booking_date' => $validated['booking_date'],

                    'duration_days' => $validated['duration_days'],

                    'member_count' => $memberCount,

                    'ticket_price' => $ticketPrice,

                    'total_price' => $totalPrice,

                    'status' => 'PENDING_PAYMENT',

                    'expires_at' => now()->addMinutes(15),
                ]);

                foreach ($validated['members'] as $member) {
                    BookingMember::create([
                        'booking_id' => $booking->id,

                        'hiker_code' => 'HIK-' .
                            Str::upper(Str::random(8)),

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
                'data' => $booking->load([
                    'hikingRoute',
                    'members',
                ]),
            ], 201);
        } catch (ValidationException $e) {
            throw $e;
        }
    }

    /**
     * Menampilkan detail booking milik pengguna.
     */
    public function show(Request $request, $id)
    {
        $booking = Booking::with([
            'hikingRoute',
            'returnRoute',
            'members',
        ])
            ->where('user_id', $request->user()->id)
            ->find($id);

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Data booking tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $booking,
        ]);
    }
}
