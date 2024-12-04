DROP TABLE IF EXISTS "logs";
DROP TABLE IF EXISTS "automations";
DROP TABLE IF EXISTS "devices";
DROP TABLE IF EXISTS "users";

CREATE TABLE "users" (
    "username" VARCHAR(25) PRIMARY KEY,
    "password" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "lifx_token" TEXT,
    CONSTRAINT "uc_users_email" UNIQUE ("email")
);

CREATE TABLE devices (
    "serial_number" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "room" VARCHAR(100),  -- Optional: If you want to categorize devices by room
    "type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "brightness" REAL DEFAULT 0,
    "color" VARCHAR(50) DEFAULT 'white',
    CONSTRAINT fk_devices_users FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
    CONSTRAINT unique_user_device_name UNIQUE (username, name)
);

CREATE TABLE "automations" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "serial_number" VARCHAR(100) NOT NULL,
    "username" VARCHAR(25),
    "triggerType" VARCHAR(50) NOT NULL,
    "triggerValue" VARCHAR(255) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "actionValue" JSON,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "fk_automations_serial_number" FOREIGN KEY ("serial_number")
    REFERENCES "devices" ("serial_number") ON DELETE CASCADE, 
    CONSTRAINT "fk_automations_username" FOREIGN KEY ("username")
    REFERENCES "users" ("username") ON DELETE CASCADE
);

CREATE TABLE "logs" (
    "id" SERIAL PRIMARY KEY,
    "serial_number" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "result" TEXT,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "username" VARCHAR(25),  -- Include username if needed
    CONSTRAINT "fk_logs_serial_number" FOREIGN KEY ("serial_number")
    REFERENCES "devices" ("serial_number"),
    CONSTRAINT "fk_logs_username" FOREIGN KEY ("username")
    REFERENCES "users" ("username") ON DELETE CASCADE
);