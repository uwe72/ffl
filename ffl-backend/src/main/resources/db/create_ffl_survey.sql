CREATE TABLE IF NOT EXISTS ffl_survey (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'ANGELEGT',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ffl_survey_question (
    id BIGSERIAL PRIMARY KEY,
    survey_id BIGINT NOT NULL REFERENCES ffl_survey(id),
    type VARCHAR(32) NOT NULL,
    text VARCHAR(2000) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    required BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS ffl_survey_question_option (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES ffl_survey_question(id),
    text VARCHAR(500) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ffl_survey_response (
    id BIGSERIAL PRIMARY KEY,
    survey_id BIGINT NOT NULL REFERENCES ffl_survey(id),
    submitted_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS ffl_survey_answer (
    id BIGSERIAL PRIMARY KEY,
    survey_response_id BIGINT NOT NULL REFERENCES ffl_survey_response(id),
    question_id BIGINT NOT NULL REFERENCES ffl_survey_question(id),
    option_id BIGINT REFERENCES ffl_survey_question_option(id),
    value TEXT
);
