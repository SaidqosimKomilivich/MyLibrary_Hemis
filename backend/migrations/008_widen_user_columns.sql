-- Users jadvalidagi VARCHAR ustunlarni kengaytirish
-- HEMIS dagi ba'zi ma'lumotlar 100 belgidan uzun bo'lishi mumkin

ALTER TABLE "users" ALTER COLUMN "full_name" TYPE VARCHAR(255);
ALTER TABLE "users" ALTER COLUMN "short_name" TYPE VARCHAR(100);
ALTER TABLE "users" ALTER COLUMN "department_name" TYPE VARCHAR(255);
ALTER TABLE "users" ALTER COLUMN "specialty_name" TYPE VARCHAR(255);
ALTER TABLE "users" ALTER COLUMN "group_name" TYPE VARCHAR(100);
ALTER TABLE "users" ALTER COLUMN "education_form" TYPE VARCHAR(100);
ALTER TABLE "users" ALTER COLUMN "staff_position" TYPE VARCHAR(255);
