import { pool } from "../db/pool";
import { Company, CompanyStatus } from "../types";
import { toCompany } from "../utils/mappers";

export interface CompanyInput {
  companyName: string;
  contactPerson: string;
  email: string;
  alternativeEmail?: string | null;
  mobile: string;
  address: string;
  pan: string;
  industry: string;
  status: CompanyStatus;
  categories: string[];
}

export const companiesService = {
  async list(): Promise<Company[]> {
    const result = await pool.query("SELECT * FROM companies ORDER BY id ASC");
    return result.rows.map(toCompany);
  },

  async get(id: number): Promise<Company | null> {
    const result = await pool.query("SELECT * FROM companies WHERE id = $1", [id]);
    return result.rows[0] ? toCompany(result.rows[0]) : null;
  },

  async listByCategories(categories: string[]): Promise<Company[]> {
    if (categories.length === 0) return [];
    // Strict requirement: Mail and recipient previews only target Active clients
    const result = await pool.query(
      "SELECT * FROM companies WHERE status = 'Active' AND categories && $1::text[] ORDER BY id ASC",
      [categories]
    );
    return result.rows.map(toCompany);
  },

  async create(payload: CompanyInput): Promise<Company> {
    const result = await pool.query(
      `INSERT INTO companies
        (company_name, contact_person, email, alternative_email, mobile, address, pan, industry, status, categories)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        payload.companyName,
        payload.contactPerson,
        payload.email,
        payload.alternativeEmail ?? null,
        payload.mobile,
        payload.address,
        payload.pan,
        payload.industry,
        payload.status,
        payload.categories,
      ]
    );
    return toCompany(result.rows[0]);
  },

  async update(id: number, payload: Partial<CompanyInput>): Promise<Company | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const merged: CompanyInput = {
      companyName: payload.companyName ?? existing.companyName,
      contactPerson: payload.contactPerson ?? existing.contactPerson,
      email: payload.email ?? existing.email,
      alternativeEmail: payload.alternativeEmail ?? existing.alternativeEmail,
      mobile: payload.mobile ?? existing.mobile,
      address: payload.address ?? existing.address,
      pan: payload.pan ?? existing.pan,
      industry: payload.industry ?? existing.industry,
      status: payload.status ?? existing.status,
      categories: payload.categories ?? existing.categories,
    };

    const result = await pool.query(
      `UPDATE companies SET
        company_name = $1, contact_person = $2, email = $3, alternative_email = $4,
        mobile = $5, address = $6, pan = $7, industry = $8, status = $9, categories = $10
       WHERE id = $11
       RETURNING *`,
      [
        merged.companyName,
        merged.contactPerson,
        merged.email,
        merged.alternativeEmail ?? null,
        merged.mobile,
        merged.address,
        merged.pan,
        merged.industry,
        merged.status,
        merged.categories,
        id,
      ]
    );
    return toCompany(result.rows[0]);
  },

  async remove(id: number): Promise<boolean> {
    const result = await pool.query("DELETE FROM companies WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async assignCategories(id: number, categories: string[]): Promise<Company | null> {
    const result = await pool.query("UPDATE companies SET categories = $1 WHERE id = $2 RETURNING *", [
      categories,
      id,
    ]);
    return result.rows[0] ? toCompany(result.rows[0]) : null;
  },
};
