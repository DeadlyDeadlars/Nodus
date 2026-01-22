-- NODUS Backend Database Schema
-- MySQL

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL,
    public_key_hash VARCHAR(64) NOT NULL,
    is_discoverable TINYINT(1) DEFAULT 1,
    created_at BIGINT NOT NULL,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS posts (
    post_id VARCHAR(32) PRIMARY KEY,
    author_id VARCHAR(64) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    signature VARCHAR(128) NOT NULL,
    timestamp BIGINT NOT NULL,
    INDEX idx_author (author_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS push_tokens (
    user_id VARCHAR(64) PRIMARY KEY,
    push_token VARCHAR(256) NOT NULL,
    platform VARCHAR(16) DEFAULT 'android',
    updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
