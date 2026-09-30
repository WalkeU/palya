# Pálya

Önhosztolt, magyar nyelvű csapat-alkalmazás: ügyfélkövető Kanban tábla, csapat feladatkövető Kanban tábla, és egy kezdőlap közös jegyzetekkel, szavazásokkal és linkekkel.

## Funkciók

- **Ügyfelek** (`/ugyfelek`): Kanban tábla a **Potenciál → Egyeztetés → Kiépítés alatt → Kész** fázisokon át, priorizálás/motiváció skálával, kommentekkel. Egy ügyfél "Nem érdekli" / "Meghiúsult" jelöléssel archiválható (nem törlődik, bármikor visszaállítható a Lezárva listáról). Beállításban választható, hogy a név vagy az üzlet neve jelenjen meg elöl.
- **Feladatok** (`/feladatok`): csapat Kanban tábla (Todo → Work in Progress → Blocked → Waiting for review → Done), külön Backlog és Lezárva nézettel. Címkék, felelős-hozzárendelés, kiemelés (piros háttér), kommentek, keresés cím alapján, szűrés felelős vagy "nincs hozzárendelve" szerint. A Done fázisban egy beállítható ideig (alapból 30 nap) veszteglő feladat automatikusan átkerül a Lezárva közé, onnan visszahozható.
- **Kezdőlap** (`/`): csapat közös jegyzetei (szabadon húzhatók/átrendezhetők, szavazásként is használhatók - egyszeres vagy többszörös választással, opciók utólag is szerkeszthetők), és testreszabható linkek listája.
- **Beállítások**: profil (avatar, becenév, sötét/világos mód), jelszóváltás, címkék kezelése, linkek szerkesztése, ügyfél-mező sorrend, feladatok automatikus lezárásának időtartama, felhasználókezelés (superadmin).

## Indítás

```bash
cp .env.example .env   # állítsd be a SESSION_SECRET-et, a PORT-ot és a SEED_ADMIN_EMAIL-t
docker compose up --build -d
```

Az app a `.env`-ben megadott `PORT`-on érhető el.

## Seed jelszó megnézése

Első indításkor a rendszer létrehozza a superadmin usert (a `.env`-ben megadott `SEED_ADMIN_EMAIL`-lel) és kiírja a generált jelszavát a logba. **Csak ekkor, egyszer.**

```bash
docker compose logs ugyfelkoveto | grep -A2 Jelszó
```

Ezzel a jelszóval kell először belépni, utána kötelező lecserélni.

## Adatok / mentés

Az adatbázis egy Docker-kezelt named volume-ban van (`docker volume ls` → `..._data`), nem a projekt mappájában, mert ez host-független és mindenhol megbízhatóan írható. Mentéshez:

```bash
docker run --rm -v ugyfelkoveto_data:/data -v "$(pwd)":/backup alpine tar czf /backup/adatok.tar.gz -C /data .
```

(a volume nevét `docker volume ls`-ből ellenőrizd, ha más a compose projekt neve).

## Fejlesztés

Lásd `CLAUDE.md` az architektúra és a gyakori parancsok leírásáért.
