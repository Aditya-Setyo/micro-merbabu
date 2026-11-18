<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->timestamps();

            $table->string('booking_code')->unique();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('hiking_route_id')
                ->constrained()
                ->restrictOnDelete();

            $table->foreignId('return_route_id')
                ->nullable()
                ->constrained('hiking_routes')
                ->nullOnDelete();

            $table->date('booking_date');
            $table->unsignedInteger('duration_days')->default(1);
            $table->unsignedInteger('member_count');

            $table->decimal('ticket_price', 12, 2);
            $table->decimal('total_price', 12, 2);

            $table->string('status')->default('PENDING_PAYMENT');


        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
