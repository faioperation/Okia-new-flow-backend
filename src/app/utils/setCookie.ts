import { Response } from "express";

type TToken = {
  accessToken: string;
  refreshToken: string;
};

export const setCookie = (res: Response, token: TToken) => {
  if (token.accessToken) {
    res.cookie("accessToken", token.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
  }
  if (token.refreshToken) {
    res.cookie("refreshToken", token.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
  }
};
