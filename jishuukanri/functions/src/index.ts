import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

/**
 * 🔐 管理者キー（固定）
 * ここを「あなたが決めた文字列」に変える
 */
const ADMIN_KEY = "8367yoshimura";

/**
 * Cloud Functions 共通設定
 */
setGlobalOptions({ region: "asia-northeast1" });

initializeApp();
const db = getFirestore();

/**
 * ======================
 * 共通：PINのハッシュ化
 * ======================
 */
function hashPin(pin: string, salt: string) {
  return crypto
    .createHash("sha256")
    .update(pin + ":" + salt)
    .digest("hex");
}

/**
 * ======================
 * 共通：管理者キー確認
 * ======================
 */
function assertAdminKey(adminKey?: string) {
  if (!adminKey || adminKey !== ADMIN_KEY) {
    throw new HttpsError("permission-denied", "Invalid adminKey");
  }
}

/**
 * ======================
 * 生徒ログイン（PIN）
 * ======================
 */
export const studentLogin = onCall(async (request) => {
  const { studentId, pin } = request.data as {
    studentId: string;
    pin: string;
  };

  if (!studentId || !pin) {
    throw new HttpsError("invalid-argument", "Missing studentId or pin");
  }

  const snap = await db.collection("students").doc(studentId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Student not found");
  }

  const data = snap.data()!;
  if (!data.active) {
    throw new HttpsError("permission-denied", "Student is inactive");
  }

  const hashed = hashPin(pin, data.pinSalt);
  if (hashed !== data.pinHash) {
    throw new HttpsError("permission-denied", "Invalid PIN");
  }

  return { ok: true };
});

/**
 * ======================
 * 生徒作成 / 更新（管理者）
 * ======================
 */
export const createStudent = onCall(async (request) => {
  const {
    studentId,
    displayName,
    pin,
    active,
    adminKey,
  } = request.data as {
    studentId: string;
    displayName?: string;
    pin?: string;
    active?: boolean;
    adminKey?: string;
  };

  assertAdminKey(adminKey);

  if (!studentId) {
    throw new HttpsError("invalid-argument", "studentId is required");
  }

  const sid = studentId.trim();
  const ref = db.collection("students").doc(sid);

  const update: any = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (displayName !== undefined) update.displayName = displayName;
  if (active !== undefined) update.active = active;

  if (pin) {
    const salt = crypto.randomBytes(16).toString("hex");
    update.pinSalt = salt;
    update.pinHash = hashPin(pin, salt);
  }

  await ref.set(update, { merge: true });

  return { ok: true, studentId: sid };
});
