import { db } from "@/lib/db";
import type { Organization } from "@prisma/client";

interface OrganizationsRepository {
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  create(data: { name: string; slug: string }): Promise<Organization>;
}

const repo: OrganizationsRepository = {
  findById(id) {
    return db.organization.findUnique({ where: { id } });
  },

  findBySlug(slug) {
    return db.organization.findUnique({ where: { slug } });
  },

  create(data) {
    return db.organization.create({ data });
  },
};

export const organizationsRepository = repo;
