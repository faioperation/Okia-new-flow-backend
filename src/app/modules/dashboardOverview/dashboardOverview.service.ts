import { prisma } from "../../db_connection";

const getStats = async () => {
  const [
    totalCandidates,
    qualityPassed,
    qualityFailed,
    cvSubmitted,
    latestActivityLogs
  ] = await Promise.all([
    prisma.candidate.count(),
    prisma.qualityCheck.count({ where: { qualityPass: true } }),
    prisma.qualityCheck.count({ where: { qualityPass: false } }),
    prisma.generatedEmail.count(),
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })
  ]);

  const successRate = totalCandidates > 0 
    ? ((qualityPassed / totalCandidates) * 100).toFixed(2) 
    : "0.00";

  return {
    totalCvImport: totalCandidates,
    qualityPassed,
    qualityFailed,
    cvSubmitted,
    successRate: `${successRate}%`,
    latestActivityLogs
  };
};

export const dashboardOverviewServices = {
  getStats,
};
