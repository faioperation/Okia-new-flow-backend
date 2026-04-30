import { Response } from "express";

type TSendResponse<T> = {
  success: boolean;
  message: string;
  statusCode: number;
  count?: number;
  totalUploadCount?: number;
  totalQualityPassCount?: number;
  totalQualityFailedCount?: number;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
  data: T | T[] | null;
};

export const sendResponse = <T>(res: Response, data: TSendResponse<T>) => {
  return res.status(data?.statusCode).json({
    success: true,
    message: data?.message,
    totalUploadCount: data?.totalUploadCount,
    totalQualityPassCount: data?.totalQualityPassCount,
    totalQualityFailedCount: data?.totalQualityFailedCount,
    meta: data?.meta,
    count: data?.count,
    data: data?.data,
  });
};
