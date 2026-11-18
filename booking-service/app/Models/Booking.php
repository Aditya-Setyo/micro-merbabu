<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Booking extends Model
{
    protected $fillable = [
        'booking_code',
        'user_id',
        'hiking_route_id',
        'return_route_id',
        'booking_date',
        'duration_days',
        'member_count',
        'ticket_price',
        'total_price',
        'status',
        'expires_at',
    ];

    protected $casts = [
        'booking_date' => 'date',
        'ticket_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'expires_at' => 'datetime',
    ];


    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function hikingRoute(): BelongsTo
    {
        return $this->belongsTo(HikingRoute::class);
    }

    public function returnRoute(): BelongsTo
    {
        return $this->belongsTo(
            HikingRoute::class,
            'return_route_id'
        );
    }

    public function members(): HasMany
    {
        return $this->hasMany(BookingMember::class);
    }
}
