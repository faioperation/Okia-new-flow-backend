import sgMail from "@sendgrid/mail";
import config from "../config";
import path from "path";
import ejs from "ejs";

sgMail.setApiKey(config.SENDGRID_API_KEY as string);

type TSendEmail = {
  to: string;
  subject: string;
  tempName: string;
  tempData?: Record<string, any>;
  attachments?: {
    fileName: string;
    content: Buffer | string;
    contentType: string;
  }[];
};

export const sendEmail = async ({
  to,
  subject,
  tempName,
  tempData,
  attachments,
}: TSendEmail) => {
  try {
    const tempPath = path.join(__dirname, `templates/${tempName}.ejs`);
    const html = await ejs.renderFile(tempPath, tempData);

    const msg = {
      to,
      from: {
        email: config.SENDGRID_FROM_EMAIL as string,
        name: config.SENDGRID_FROM_NAME as string,
      },
      replyTo: config.SENDGRID_REPLY_TO_EMAIL as string,
      subject,
      html,
      attachments: attachments?.map((x) => ({
        content: Buffer.isBuffer(x.content)
          ? x.content.toString("base64")
          : Buffer.from(x.content).toString("base64"),
        filename: x.fileName,
        type: x.contentType,
        disposition: "attachment",
      })),
    };

    const info = await sgMail.send(msg);
    console.log("Email Send Done via SendGrid", info[0].headers["x-message-id"]);
    return info;
  } catch (err: any) {
    console.error("Email Send Failed via SendGrid", err.response?.body || err);
    throw err;
  }
};