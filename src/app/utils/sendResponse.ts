import { Response } from "express";

type TSendResponse<T> = {
  success: boolean;
  message: string;
  statusCode: number;
  data: T | T[] | null;
};

export const sendResponse = <T>(res: Response, data: TSendResponse<T>) => {
  return res.status(data?.statusCode).json({
    success: true,
    message: data?.message,
    data: data?.data,
  });
};
