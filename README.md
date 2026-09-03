# Pálya — Ügyfélkövető

Kanban board ügyfelek nyomon követésére: **Potenciál → Egyeztetés → Kiépítés alatt → Kész**.

## Indítás

```bash
cp .env.example .env   # állítsd be a SESSION_SECRET-et, a PORT-ot és a SEED_ADMIN_EMAIL-t
docker compose up --build -d
```

Az app a `.env`-ben megadott `PORT`-on érhető el.

## Seed jelszó megnézése

Első indításkor a rendszer létrehozza a superadmin usert (a `.env`-ben megadott `SEED_ADMIN_EMAIL`-lel) és kiírja a generált jelszavát a logba — **csak ekkor, egyszer**:

```bash
docker compose logs ugyfelkoveto | grep -A2 Jelszó
```

Ezzel a jelszóval kell először belépni, utána kötelező lecserélni.

## Adatok / mentés

Az adatbázis egy Docker-kezelt named volume-ban van (`docker volume ls` → `..._data`), nem a projekt mappájában — ez host-független, mindenhol megbízhatóan írható. Mentéshez:

```bash
docker run --rm -v ugyfelkoveto_data:/data -v "$(pwd)":/backup alpine tar czf /backup/adatok.tar.gz -C /data .
```

(a volume nevét `docker volume ls`-ből ellenőrizd, ha más a compose projekt neve).
