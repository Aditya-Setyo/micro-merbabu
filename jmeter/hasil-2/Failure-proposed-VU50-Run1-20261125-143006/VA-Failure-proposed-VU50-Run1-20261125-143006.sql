USE payment_db; SELECT va_number FROM payments WHERE booking_id IN (SELECT id FROM booking_db.bookings WHERE booking_code LIKE 'BKG-%') ORDER BY booking_id;
