-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Page" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "spendTime" BIGINT,
    "spendMemory" BIGINT,
    "filename" TEXT NOT NULL
);
INSERT INTO "new_Page" ("filename", "id", "spendMemory", "spendTime", "startedAt") SELECT "filename", "id", "spendMemory", "spendTime", "startedAt" FROM "Page";
DROP TABLE "Page";
ALTER TABLE "new_Page" RENAME TO "Page";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
