import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { releasePackages, verifyIntegrity } from "./bootstrap-ui.mjs";

const bytes = Buffer.from("reviewed package");
const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
const lock = {
  packages: Object.fromEntries(["ui-theme", "ui-react"].map(name => [
    `node_modules/@wintermuted/${name}`, { version: "1.0.0", integrity }
  ]))
};

test("uses locked versions for separate release assets without changing the lockfile", () => {
  const before = JSON.stringify(lock);
  const packages = releasePackages(lock);
  assert.equal(packages[0].url,
    "https://github.com/wintermuted/wintermuted-ui/releases/download/ui-theme%401.0.0/wintermuted-ui-theme-1.0.0.tgz");
  assert.equal(packages[1].filename, "wintermuted-ui-react-1.0.0.tgz");
  assert.equal(JSON.stringify(lock), before);
});

test("rejects missing versions or integrity instead of selecting an unverified release", () => {
  assert.throws(() => releasePackages({ packages: {} }), /locked version/);
  const invalid = structuredClone(lock);
  delete invalid.packages["node_modules/@wintermuted/ui-react"].integrity;
  assert.throws(() => releasePackages(invalid), /SHA-512/);
});

test("accepts exact locked bytes and rejects tampered tarballs", () => {
  verifyIntegrity(bytes, integrity, "ui-theme");
  assert.throws(() => verifyIntegrity(Buffer.from("modified"), integrity, "ui-theme"),
    /Integrity mismatch/);
});
