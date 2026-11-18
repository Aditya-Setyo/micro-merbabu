<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SosReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'ticket_code',
        'latitude',
        'longitude',
        'message',
        'status',
    ];
}
