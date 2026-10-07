import { pool } from "../db/pool";
import { ApiError } from "../middleware/error-handler";
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
  sector: string;
  status: CompanyStatus;
  categories: string[];
}

async function assertActiveActs(input: Pick<CompanyInput, "categories">) {
  const requestedActs = [...new Set(input.categories)];
  const result = await pool.query<{ category: string }>(
    "SELECT category FROM categories WHERE status = 'Active' AND category = ANY($1::text[])",
    [requestedActs]
  );
  const activeActs = new Set(result.rows.map((row) => row.category));
  const unavailableActs = requestedActs.filter((act) => !activeActs.has(act));

  if (unavailableActs.length > 0) {
    throw new ApiError(
      400,
      `These acts are no longer active: ${unavailableActs.join(", ")}. Refresh and select current acts.`
    );
  }
}

async function resolveSectorId(sector: string | null, requireActive: boolean): Promise<number | null> {
  if (!sector) return null;
  const result = await pool.query<{ id: number }>(
    `SELECT id FROM sectors WHERE sector = $1${requireActive ? " AND status = 'Active'" : ""}`,
    [sector]
  );
  if (!result.rows[0]) {
    throw new ApiError(400, `The selected sector "${sector}" is unavailable. Refresh and select an active sector.`);
  }
  return result.rows[0].id;
}

const companySelect = `
  SELECT companies.*, sectors.sector AS sector
  FROM companies
  LEFT JOIN sectors ON sectors.id = companies.sector_id
`;

export const companiesService = {
  async list(): Promise<Company[]> {
    const result = await pool.query(`${companySelect} ORDER BY companies.id ASC`);
    return result.rows.map(toCompany);
  },

  async get(id: number): Promise<Company | null> {
    const result = await pool.query(`${companySelect} WHERE companies.id = $1`, [id]);
    return result.rows[0] ? toCompany(result.rows[0]) : null;
  },

  async listByCategories(categories: string[]): Promise<Company[]> {
    if (categories.length === 0) return [];
    // Strict requirement: Mail and recipient previews only target Active clients
    const result = await pool.query(
      `${companySelect} WHERE companies.status = 'Active' AND companies.categories && $1::text[] ORDER BY companies.id ASC`,
      [categories]
    );
    return result.rows.map(toCompany);
  },

  async create(payload: CompanyInput): Promise<Company> {
    const sectorId = await resolveSectorId(payload.sector, true);
    if (sectorId === null) throw new ApiError(400, "A sector is required.");
    await assertActiveActs(payload);
    const result = await pool.query(
      `INSERT INTO companies
        (company_name, contact_person, email, alternative_email, mobile, address, pan, act, sector_id, status, categories)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        payload.companyName,
        payload.contactPerson,
        payload.email,
        payload.alternativeEmail ?? null,
        payload.mobile,
        payload.address,
        payload.pan,
        payload.sector,
        sectorId,
        payload.status,
        payload.categories,
      ]
    );
    return (await this.get(result.rows[0].id))!;
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
      sector: payload.sector ?? existing.sector ?? "",
      status: payload.status ?? existing.status,
      categories: payload.categories ?? existing.categories,
    };

    await assertActiveActs(merged);
    const sectorId =
      payload.sector !== undefined
        ? await resolveSectorId(merged.sector, true)
        : await resolveSectorId(existing.sector, false);
    const result = await pool.query(
      `UPDATE companies SET
        company_name = $1, contact_person = $2, email = $3, alternative_email = $4,
        mobile = $5, address = $6, pan = $7, act = $8, sector_id = $9, status = $10, categories = $11
       WHERE id = $12
       RETURNING id`,
      [
        merged.companyName,
        merged.contactPerson,
        merged.email,
        merged.alternativeEmail ?? null,
        merged.mobile,
        merged.address,
        merged.pan,
        merged.sector,
        sectorId,
        merged.status,
        merged.categories,
        id,
      ]
    );
    return result.rows[0] ? this.get(id) : null;
  },

  async remove(id: number): Promise<boolean> {
    const result = await pool.query("DELETE FROM companies WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async assignCategories(id: number, categories: string[]): Promise<Company | null> {
    const result = await pool.query("UPDATE companies SET categories = $1 WHERE id = $2 RETURNING id", [
      categories,
      id,
    ]);
    return result.rows[0] ? this.get(id) : null;
  },
};
