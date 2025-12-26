-- Circle Security Questions Migration
-- This migration adds the circle_security_questions table for storing security question metadata

-- Create the circle_security_questions table
CREATE TABLE IF NOT EXISTS circle_security_questions (
    id TEXT NOT NULL,
    circle_user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    question_index INTEGER NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,

    CONSTRAINT circle_security_questions_pkey PRIMARY KEY (id)
);

-- Create unique constraint on circle_user_id + question_index
CREATE UNIQUE INDEX IF NOT EXISTS circle_security_questions_circle_user_id_question_index_key 
    ON circle_security_questions(circle_user_id, question_index);

-- Create index on circle_user_id for faster lookups
CREATE INDEX IF NOT EXISTS circle_security_questions_circle_user_id_idx 
    ON circle_security_questions(circle_user_id);

-- Add foreign key constraint to circle_users table
ALTER TABLE circle_security_questions
    ADD CONSTRAINT circle_security_questions_circle_user_id_fkey 
    FOREIGN KEY (circle_user_id) REFERENCES circle_users(id) ON DELETE CASCADE ON UPDATE CASCADE;
