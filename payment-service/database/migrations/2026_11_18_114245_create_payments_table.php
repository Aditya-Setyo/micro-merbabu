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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            // Referensi booking dari Booking Service
            // Tidak menggunakan foreign key lintas database.
            $table->unsignedBigInteger('booking_id');
            $table->string('booking_code', 50);

            // Identitas pemesan
            $table->string('customer_email');

            // Identitas pembayaran
            $table->string('payment_code', 50)->unique();
            $table->decimal('amount', 15, 2);

            // PENDING_OTP, WAITING_PAYMENT, PAID,
            // FAILED, EXPIRED, CANCELLED
            $table->string('status', 30)
                ->default('PENDING_OTP');

            // Contoh: VA_BCA, VA_BNI, VA_MANDIRI
            $table->string('payment_method', 30)->nullable();

            $table->string('virtual_account_number', 30)
                ->nullable()
                ->unique();

            $table->string('gateway_reference', 100)
                ->nullable();

            $table->text('failure_reason')->nullable();

            $table->timestamp('expires_at')->nullable();
            $table->timestamp('paid_at')->nullable();

            $table->timestamps();

            $table->index(['booking_id', 'status']);
            $table->index('booking_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
