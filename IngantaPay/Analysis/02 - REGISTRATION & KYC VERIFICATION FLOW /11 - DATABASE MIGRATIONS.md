DATABASE MIGRATIONS PROMPT:

Create database migrations for the complete KYC system in apps/api.

MIGRATION 1: Update users table

ALTER TABLE users
ADD COLUMN full_name VARCHAR(255),
ADD COLUMN address TEXT,
ADD COLUMN referral_code VARCHAR(50),
ADD COLUMN kyc_status ENUM('pending', 'in_progress', 'submitted', 'approved', 'rejected') DEFAULT 'pending',
ADD COLUMN kyc_submitted_at TIMESTAMP NULL,
ADD COLUMN kyc_approved_at TIMESTAMP NULL,
ADD COLUMN kyc_rejected_at TIMESTAMP NULL,
ADD COLUMN kyc_reference_id VARCHAR(50) UNIQUE NULL,
ADD COLUMN kyc_rejection_reason TEXT NULL,
ADD COLUMN assigned_reviewer_id INT NULL,
ADD INDEX idx_kyc_status (kyc_status),
ADD INDEX idx_kyc_reference_id (kyc_reference_id),
ADD FOREIGN KEY (assigned_reviewer_id) REFERENCES admins(id) ON DELETE SET NULL;

-- Migrate existing first_name + last_name to full_name
UPDATE users SET full_name = CONCAT(first_name, ' ', last_name);

-- Drop old columns (optional, do this after verifying data migration)
-- ALTER TABLE users DROP COLUMN first_name, DROP COLUMN last_name;

MIGRATION 2: Create kyc_personal_info table

CREATE TABLE kyc_personal_info (
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL UNIQUE,
first_name VARCHAR(100) NOT NULL,
last_name VARCHAR(100) NOT NULL,
date_of_birth DATE NOT NULL,
gender ENUM('male', 'female', 'other') NOT NULL,
nationality VARCHAR(100) NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
INDEX idx_user_id (user_id)
);

MIGRATION 3: Create kyc_address_info table

CREATE TABLE kyc_address_info (
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL UNIQUE,
street_address VARCHAR(255) NOT NULL,
city VARCHAR(100) NOT NULL,
district VARCHAR(100) NOT NULL,
country VARCHAR(100) NOT NULL,
postal_code VARCHAR(20) NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
INDEX idx_user_id (user_id)
);

MIGRATION 4: Create kyc_documents table

CREATE TABLE kyc_documents (
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL,
document_type ENUM('personal_info', 'address_proof', 'national_id', 'passport', 'drivers_license', 'selfie') NOT NULL,
document_url TEXT NOT NULL,
file_name VARCHAR(255),
file_size INT,
mime_type VARCHAR(100),
status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
verified_at TIMESTAMP NULL,
verified_by INT NULL,
rejection_reason TEXT NULL,
metadata JSON,
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
FOREIGN KEY (verified_by) REFERENCES admins(id) ON DELETE SET NULL,
INDEX idx_user_id (user_id),
INDEX idx_document_type (document_type),
INDEX idx_status (status)
);

MIGRATION 5: Create kyc_audit_log table

CREATE TABLE kyc_audit_log (
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL,
admin_id INT NULL,
action VARCHAR(100) NOT NULL,
old_status VARCHAR(50) NULL,
new_status VARCHAR(50) NULL,
notes TEXT NULL,
ip_address VARCHAR(45),
user_agent TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
INDEX idx_user_id (user_id),
INDEX idx_action (action),
INDEX idx_created_at (created_at)
);

MIGRATION 6: Create palm_enrollment_centers table

CREATE TABLE palm_enrollment_centers (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(255) NOT NULL,
address TEXT NOT NULL,
city VARCHAR(100) NOT NULL,
country VARCHAR(100) NOT NULL,
latitude DECIMAL(10, 8) NOT NULL,
longitude DECIMAL(11, 8) NOT NULL,
is_active BOOLEAN DEFAULT TRUE,
operating_hours JSON,
contact_phone VARCHAR(50),
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
INDEX idx_location (latitude, longitude),
INDEX idx_is_active (is_active)
);

-- Seed sample enrollment centers
INSERT INTO palm_enrollment_centers (name, address, city, country, latitude, longitude, is_active) VALUES
('Shoprite Lugogo', 'Lugogo Mall, Kampala', 'Kampala', 'Uganda', 0.3476, 32.6067, TRUE),
('Quality Supermarket', 'Garden City, Kampala', 'Kampala', 'Uganda', 0.3376, 32.6167, TRUE),
('Game Store Ntinda', 'Ntinda Complex', 'Kampala', 'Uganda', 0.3576, 32.6267, TRUE);

MIGRATION 7: Create palm_enrollment_requests table

CREATE TABLE palm_enrollment_requests (
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL,
center_id INT NOT NULL,
status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
enrollment_code VARCHAR(50) UNIQUE NOT NULL,
requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
completed_at TIMESTAMP NULL,
notes TEXT NULL,
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
FOREIGN KEY (center_id) REFERENCES palm_enrollment_centers(id) ON DELETE CASCADE,
INDEX idx_user_id (user_id),
INDEX idx_status (status),
INDEX idx_enrollment_code (enrollment_code)
);

MIGRATION 8: Create referral_tracking table

CREATE TABLE referral_tracking (
id INT AUTO_INCREMENT PRIMARY KEY,
referrer_user_id INT NOT NULL,
referred_user_id INT NOT NULL UNIQUE,
referral_code VARCHAR(50) NOT NULL,
status ENUM('pending', 'completed', 'rewarded') DEFAULT 'pending',
reward_amount DECIMAL(10, 2) NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
completed_at TIMESTAMP NULL,
rewarded_at TIMESTAMP NULL,
FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
INDEX idx_referrer (referrer_user_id),
INDEX idx_referral_code (referral_code),
INDEX idx_status (status)
);

-- Create stored procedure to generate KYC reference ID
DELIMITER //
CREATE PROCEDURE generate_kyc_reference_id(IN user_id_param INT)
BEGIN
DECLARE ref_id VARCHAR(50);
DECLARE date_part VARCHAR(20);
DECLARE random_part VARCHAR(10);

SET date_part = DATE_FORMAT(NOW(), '%Y-%m%d');
SET random_part = LPAD(FLOOR(RAND() \* 10000), 4, '0');
SET ref_id = CONCAT('KYC-', date_part, '-', random_part);

UPDATE users
SET kyc_reference_id = ref_id
WHERE id = user_id_param;

SELECT ref_id;
END //
DELIMITER ;
