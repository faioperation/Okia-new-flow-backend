import { prisma } from "../../db_connection";

const getAllOutreachLogs = async (query: any) => {
  const { batchId, email, limit = 10, page = 1 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (batchId) where.batchId = batchId;
  if (email) where.email = { contains: email, mode: 'insensitive' };

  const result = await prisma.bulkOutreachLog.findMany({
    where,
    skip,
    take: Number(limit),
    orderBy: { sentAt: 'desc' },
    include: {
      batch: true
    }
  });

  const total = await prisma.bulkOutreachLog.count({ where });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total
    },
    data: result
  };
};

const getOutreachLogsByBatch = async (batchId: string) => {
  const result = await prisma.bulkOutreachLog.findMany({
    where: { batchId },
    orderBy: { sentAt: 'desc' }
  });
  return result;
};

export const bulkOutreachLogServices = {
  getAllOutreachLogs,
  getOutreachLogsByBatch
};
