#!/bin/bash
# ===================================================
# MyLibrary - Server Deploy Skripti
# Ishlatish: bash deploy.sh
# ===================================================

set -e  # Xato bo'lsa to'xtatish

echo "======================================"
echo " MyLibrary - Deploy boshlandi"
echo " $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"

# 1. Git dan yangilanishlarni olish
echo ""
echo "[1/5] Git dan so'nggi o'zgarishlarni olish..."
git pull origin main

# 2. Eski konteynerlarni to'xtatish
echo ""
echo "[2/5] Eski konteynerlar to'xtatilmoqda..."
docker compose down --remove-orphans

# 3. Yangi imejlarni build qilish
echo ""
echo "[3/5] Docker imejlari build qilinmoqda... (bu biroz vaqt olishi mumkin)"
docker compose build --no-cache

# 4. Konteynerlarni ishga tushirish
echo ""
echo "[4/5] Konteynerlar ishga tushirilmoqda..."
docker compose up -d

# 5. Holat tekshiruvi
echo ""
echo "[5/5] Konteynerlar holati:"
sleep 5
docker compose ps

echo ""
echo "======================================"
echo " Deploy muvaffaqiyatli yakunlandi!"
echo " Sayt: http://$(hostname -I | awk '{print $1}')"
echo "======================================"
