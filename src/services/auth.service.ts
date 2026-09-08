import crypto from "node:crypto";

import { pool } from "../db/pool";

export type UserRole = "Partner" | "AuditStaff";

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  salt: string;
  full_name: string;
  role: UserRole;
  created_at: Date;
}

export interface JwtPayload {
  userId: number;
  email: string;
  fullName: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "reconepal_ca_firm_jwt_secret_key_2026";

export const authService = {
  hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")): { hash: string; salt: string } {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return { hash, salt };
  },

  verifyPassword(password: string, hash: string, salt: string): boolean {
    try {
      const check = crypto.scryptSync(password, salt, 64).toString("hex");
      return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
    } catch {
      return false;
    }
  },

  signToken(user: User): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 7 * 24 * 60 * 60; // 7 days
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      iat: now,
      exp,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    return `${header}.${body}.${signature}`;
  },

  verifyToken(token: string): JwtPayload | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const [header, body, signature] = parts;
      const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
      if (signature.length !== expectedSig.length) return null;
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;
      const payload: JwtPayload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
      return payload;
    } catch {
      return null;
    }
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await pool.query<UserRow>(
      `SELECT id, email, password_hash, salt, full_name, role, created_at FROM users WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );
    return result.rows[0] ?? null;
  },

  async findById(id: number): Promise<User | null> {
    const result = await pool.query<UserRow>(
      `SELECT id, email, full_name, role, created_at FROM users WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      createdAt: row.created_at.toISOString(),
    };
  },

  async createUser(data: { email: string; password: string; fullName: string; role: UserRole }): Promise<User> {
    const { hash, salt } = this.hashPassword(data.password);
    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, salt, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, created_at`,
      [data.email.toLowerCase().trim(), hash, salt, data.fullName.trim(), data.role]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      createdAt: row.created_at.toISOString(),
    };
  },

  async authenticate(email: string, password: string): Promise<{ user: User; token: string } | null> {
    const row = await this.findByEmail(email);
    if (!row) return null;
    const isValid = this.verifyPassword(password, row.password_hash, row.salt);
    if (!isValid) return null;

    const user: User = {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      createdAt: row.created_at.toISOString(),
    };
    const token = this.signToken(user);
    return { user, token };
  },
};
