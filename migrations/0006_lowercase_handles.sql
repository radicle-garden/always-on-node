-- Bail out if any active handles would collide after lowercasing.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "user"
      WHERE deleted IS NOT TRUE
      GROUP BY LOWER(handle) HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Conflicting handles found — resolve manually before migrating';
  END IF;
END $$;

UPDATE "user" SET handle = LOWER(handle);
UPDATE "node" SET alias = LOWER(alias);
