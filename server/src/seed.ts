import { db } from "./db";
import { generatePassword, hashPassword } from "./utils/password";

export function seedSuperAdmin() {
  const countRow = db.prepare("SELECT COUNT(*) as c FROM users").get() as {
    c: number;
  };
  if (countRow.c > 0) return;

  const email = (process.env.SEED_ADMIN_EMAIL || "admin@example.com")
    .trim()
    .toLowerCase();
  const tempPassword = generatePassword(16);
  const hash = hashPassword(tempPassword);

  db.prepare(
    `INSERT INTO users (email, nickname, password_hash, role, must_change_password)
     VALUES (?, NULL, ?, 'superadmin', 1)`
  ).run(email, hash);

  console.log("============================================================");
  console.log(" Seed superadmin létrehozva.");
  console.log(` Email:    ${email}`);
  console.log(` Jelszó:   ${tempPassword}`);
  console.log(" Ezt a jelszót csak most látod - első belépéskor meg kell változtatni.");
  console.log("============================================================");
}
