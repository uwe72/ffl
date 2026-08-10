-- Repariert den CHECK-Constraint ffl_deposit_payment_method_check,
-- damit die Zahlungsart OTHER ("Sonstiges") erlaubt ist (siehe PaymentMethod-Enum).
-- Wird automatisch beim Start durch SchemaMigrationRunner ausgeführt;
-- diese Datei dient nur als Referenz für manuelle Ausführungen.

ALTER TABLE ffl_deposit DROP CONSTRAINT IF EXISTS ffl_deposit_payment_method_check;

ALTER TABLE ffl_deposit ADD CONSTRAINT ffl_deposit_payment_method_check
    CHECK (payment_method IN ('PAYPAL','UEBERWEISUNG','OTHER') OR payment_method IS NULL);
