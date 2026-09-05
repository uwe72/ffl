-- Repariert den CHECK-Constraint ffl_survey_question_type_check,
-- der SEPARATOR (Trenner) nicht enthielt und das Speichern von Umfragen
-- mit Trennern verhinderte (SQLState 23514). Die erlaubten Werte werden
-- im Code durch das QuestionType-Enum validiert, daher entfaellt der
-- Constraint komplett.
-- Wird automatisch beim Start durch SchemaMigrationRunner ausgefuehrt;
-- diese Datei dient nur als Referenz fuer manuelle Ausfuehrungen.

ALTER TABLE ffl_survey_question DROP CONSTRAINT IF EXISTS ffl_survey_question_type_check;
