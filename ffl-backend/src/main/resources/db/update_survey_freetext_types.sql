-- Freitext-Fragen in Textfeld/Textarea aufteilen + Max-Länge vergeben
UPDATE ffl_survey_question SET type = 'TEXTAREA' WHERE type = 'FREETEXT';

UPDATE ffl_survey_question
SET max_length = 255
WHERE type = 'TEXTFIELD' AND max_length IS NULL;

UPDATE ffl_survey_question
SET max_length = 4000
WHERE type = 'TEXTAREA' AND max_length IS NULL;
