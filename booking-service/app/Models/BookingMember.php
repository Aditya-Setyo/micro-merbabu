<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingMember extends Model
{
    protected $fillable = [
        'booking_id',
        'hiker_code',
        'name',
        'identity_type',
        'nik',
        'nationality',
        'address',
        'age',
        'weight',
        'phone',
        'is_leader',
    ];

    protected $casts = [
        'is_leader' => 'boolean',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
