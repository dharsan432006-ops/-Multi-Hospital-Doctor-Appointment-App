-- Prevent double booking: one active (PENDING/CONFIRMED) appointment per doctor per start time.
-- Covers cross-hospital overlap for the same doctor at identical startsAt; interval overlaps
-- are additionally enforced in application code inside a serializable transaction.
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_no_double_booking"
  ON "Appointment"("doctorId", "startsAt")
  WHERE "status" IN ('PENDING', 'CONFIRMED');
