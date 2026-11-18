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
        Schema::create('booking_members', function (Blueprint $table) {
            $table->id();
            $table->timestamps();

            $table->foreignId('booking_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('hiker_code')->nullable();
            $table->string('name');
            $table->string('identity_type')->default('KTP');
            $table->string('nik', 20);
            $table->string('nationality')->default('Indonesia');
            $table->text('address');
            $table->unsignedInteger('age');
            $table->decimal('weight', 5, 2);
            $table->string('phone', 20);

            $table->boolean('is_leader')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_members');
    }
};
