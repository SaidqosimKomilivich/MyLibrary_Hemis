#!/bin/sh

# Yakshanba kuni soat 5:00 da bajariluvchi zaxira skripti
# Ushbu skriptni cron yordamida ishlashga belgilangan.

BACKUP_DIR="/backups"
DB_NAME=${PGDB:-kutubxona_db}
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.dump"

echo "[$(date)] Zaxira nusxalarini yaratish boshlandi..."

# Eski zaxira nusxani o'chirish
echo "[$(date)] Eski zaxira fayllarini o'chirish..."
rm -f ${BACKUP_DIR}/*.dump

# Yangi zaxira nusxa yaratiladi (custom format .dump)
echo "[$(date)] Yangi zaxira nusxa yaratilmoqda: ${BACKUP_FILE} ..."
pg_dump -h ${PGHOST:-db} -U ${PGUSER:-postgres} -d ${DB_NAME} -F c -f ${BACKUP_FILE}

if [ $? -eq 0 ]; then
  echo "[$(date)] Zaxiralash muvaffaqiyatli yakunlandi: ${BACKUP_FILE}"
else
  echo "[$(date)] Xatolik! Zaxiralash amalga oshmadi."
  exit 1
fi
