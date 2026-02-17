-- 1-QADAM: Avtomatik vaqt yangilash uchun funksiya yaratamiz (Generic Function)
-- Bu funksiya nafaqat bu jadvalda, balki kelajakda boshqa jadvallarda ham ishlatilishi mumkin.
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.departure = CURRENT_TIMESTAMP(0);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2-QADAM: Jadvalni yaratamiz
CREATE TABLE "control" (
    -- ID: UUID ishlatiladi va avtomatik generatsiya qilinadi (Postgres 13+)
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- USER_ID: Foydalanuvchi IDsi.
    "user_id" VARCHAR(255) NOT NULL,

    -- ARRIVAL: Foydalanuvchi kelgan vaqti (Insert bo'lganda yoziladi va o'zgarmaydi)
    "arrival" TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- DEPARTURE: Ketgan yoki so'nggi faollik vaqti (Boshida arrival bilan teng bo'ladi, keyin update bo'lganda o'zgaradi)
    "departure" TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3-QADAM: Indekslash (Performance)
CREATE INDEX "idx_control_user_id" ON "control" ("user_id");

-- 4-QADAM: Triggerni ulash (Automation)
CREATE TRIGGER "set_control_departure_time"
BEFORE UPDATE ON "control"
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();
