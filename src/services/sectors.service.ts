import { pool } from "../db/pool";
import { Sector, SectorStatus } from "../types";
import { toSector } from "../utils/mappers";

export interface SectorInput {
  sector: string;
  description: string;
  status: SectorStatus;
}

const selectWithCompanyCount = `
  SELECT
    s.id, s.sector, s.description, s.status, s.created_date,
    (SELECT COUNT(*) FROM companies c WHERE c.sector_id = s.id) AS company_count
  FROM sectors s
`;

export const sectorsService = {
  async list(): Promise<Sector[]> {
    const result = await pool.query(`${selectWithCompanyCount} ORDER BY s.id ASC`);
    return result.rows.map(toSector);
  },

  async get(id: number): Promise<Sector | null> {
    const result = await pool.query(`${selectWithCompanyCount} WHERE s.id = $1`, [id]);
    return result.rows[0] ? toSector(result.rows[0]) : null;
  },

  async create(payload: SectorInput): Promise<Sector> {
    const result = await pool.query(
      "INSERT INTO sectors (sector, description, status) VALUES ($1, $2, $3) RETURNING id",
      [payload.sector, payload.description, payload.status]
    );
    return (await this.get(result.rows[0].id))!;
  },

  async update(id: number, payload: Partial<SectorInput>): Promise<Sector | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const result = await pool.query(
      `UPDATE sectors
       SET sector = $1, description = $2, status = $3
       WHERE id = $4
       RETURNING id`,
      [
        payload.sector ?? existing.sector,
        payload.description ?? existing.description,
        payload.status ?? existing.status,
        id,
      ]
    );
    return result.rows[0] ? this.get(id) : null;
  },

  async remove(id: number): Promise<boolean> {
    const result = await pool.query("DELETE FROM sectors WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  },
};
