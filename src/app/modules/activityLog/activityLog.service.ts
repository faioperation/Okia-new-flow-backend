import { prisma } from "../../db_connection";

const createLog = async (userId: string, action: string, message: string, payload?: any) => {
  const result = await prisma.activityLog.create({
    data: {
      userId,
      action,
      message,
      payload,
    },
  });
  return result;
};

const getAllLogs = async (userId: string, query: any) => {
  const { page = 1, limit = 10, action } = query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {
    userId,
  };

  if (action) {
    where.action = action;
  }

  const result = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });

  const total = await prisma.activityLog.count({ where });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
    },
    data: result,
  };
};

export const activityLogServices = {
  createLog,
  getAllLogs,
};
