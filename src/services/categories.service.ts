import { pool } from "../db/pool";
import { Category, CategoryStatus } from "../types";
import { toCategory } from "../utils/mappers";

export interface CategoryInput {
  category: string;
  description: string;
  status: CategoryStatus;
}

const selectWithCompanyCount = `
  SELECT
    c.id, c.category, c.description, c.status, c.created_date,
    (SELECT COUNT(*) FROM companies co WHERE c.category = ANY(co.categories)) AS company_count
  FROM categories c
`;

export const categoriesService = {
  async list(): Promise<Category[]> {
    const result = await pool.query(`${selectWithCompanyCount} ORDER BY c.id ASC`);
    return result.rows.map(toCategory);
  },

  async get(id: number): Promise<Category | null> {
    const result = await pool.query(`${selectWithCompanyCount} WHERE c.id = $1`, [id]);
    return result.rows[0] ? toCategory(result.rows[0]) : null;
  },

  async create(payload: CategoryInput): Promise<Category> {
    const result = await pool.query(
      "INSERT INTO categories (category, description, status) VALUES ($1, $2, $3) RETURNING id",
      [payload.category, payload.description, payload.status]
    );
    return (await this.get(result.rows[0].id))!;
  },

  async update(id: number, payload: Partial<CategoryInput>): Promise<Category | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const newCategory = payload.category ?? existing.category;
    const newDescription = payload.description ?? existing.description;
    const newStatus = payload.status ?? existing.status;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "UPDATE categories SET category = $1, description = $2, status = $3 WHERE id = $4",
        [newCategory, newDescription, newStatus, id]
      );

      // If category name changed, update companies that reference the old category name
      if (payload.category && payload.category !== existing.category) {
        await client.query(
          "UPDATE companies SET categories = array_replace(categories, $1, $2) WHERE $1 = ANY(categories)",
          [existing.category, payload.category]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return this.get(id);
  },

  async remove(id: number): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing) return false;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Remove this category from any companies before deleting
      await client.query(
        "UPDATE companies SET categories = array_remove(categories, $1) WHERE $1 = ANY(categories)",
        [existing.category]
      );
      const result = await client.query("DELETE FROM categories WHERE id = $1", [id]);
      await client.query("COMMIT");
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};
