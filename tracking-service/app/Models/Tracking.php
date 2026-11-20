<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tracking extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'ticket_code',
        'status',
        'checked_in_at',
        'checked_out_at',
        'last_latitude',
        'last_longitude',
        'last_location_note',
        'hiker_code',
        'member_name',
        'gelang_id',
    ];

    protected $casts = [
        'checked_in_at' => 'datetime',
        'checked_out_at' => 'datetime',
    ];
}
