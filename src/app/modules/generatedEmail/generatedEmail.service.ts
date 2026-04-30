import { prisma } from "../../db_connection";
import config from "../../config";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import { activityLogServices } from '../activityLog/activityLog.service';
import { generatedCvServices } from '../generatedCv/generatedCv.service';
import { QueryBuilder } from "../../utils/QuaryBuilder";
import sgMail from '@sendgrid/mail';
import ejs from 'ejs';
import path from 'path';
import fs from 'fs';

sgMail.setApiKey(config.SENDGRID_API_KEY as string);

const createGeneratedEmail = async (userId: string, generatedCvId: string, contactIds: string[]) => {
  // 1. Check if the generated CV exists
  const generatedCv = await prisma.generatedCV.findUnique({
    where: { id: generatedCvId },
  });

  if (!generatedCv) {
    throw new ApiError(httpStatus.NOT_FOUND, "Generated CV record not found");
  }

  // 2. Call AI API to generate email data
  const aiUrl = `${config.AI_API_URL}/mailGen/${generatedCvId}`;

  const response = await fetch(aiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Backend-Token': config.AI_HEADER_KEY
    }
  });

  if (!response.ok) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `AI Email Generation failed: ${response.statusText}`);
  }

  const aiResponse = await response.json();
  const emailData = aiResponse.data;

  // 3. Save to database
  const result = await prisma.generatedEmail.create({
    data: {
      userId,
      generatedCvId,
      contactIds,
      subject: emailData.email_content.subject,
      salutation: emailData.email_content.salutation,
      introParagraph: emailData.email_content.intro_paragraph,
      keyHighlights: emailData.email_content.key_highlights,
      impactStatement: emailData.email_content.impact_statement,
      closingStatement: emailData.email_content.closing_statement,
      nbFooter: emailData.email_content.nb_footer,
      signatureBlock: emailData.signature_block,
      rawEmailResponse: aiResponse,
    },
    include: {
      generatedCv: true,
      user: true
    }
  });

  // Log the activity
  if (result) {
    await activityLogServices.createLog(
      userId,
      "EMAIL_GENERATION",
      `Generated AI email for CV ID: ${generatedCvId}`,
      { emailId: result.id, generatedCvId, contactCount: contactIds.length }
    );
  }

  if (result) {
    const emailData: any = result;
    delete emailData.rawEmailResponse;
    return emailData;
  }

  return result;
};

const getAllGeneratedEmails = async (query: any) => {
  const generatedEmailQuery = new QueryBuilder(query)
    .filter()
    .sort('createdAt')
    .paginate()
    .build();

  const whereCondition = {
    ...generatedEmailQuery.where,
    deletedAt: null
  };

  const result = await prisma.generatedEmail.findMany({
    where: whereCondition,
    orderBy: generatedEmailQuery.orderBy,
    skip: generatedEmailQuery.skip,
    take: generatedEmailQuery.take,
    include: {
      generatedCv: true,
      user: true
    }
  });

  const total = await prisma.generatedEmail.count({
    where: whereCondition
  });

  const data = result.map(item => {
    const emailData: any = item;
    delete emailData.rawEmailResponse;
    return emailData;
  });

  return {
    data,
    meta: {
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
      total,
      totalPage: Math.ceil(total / (Number(query.limit) || 10)),
    }
  };
};

const getGeneratedEmailById = async (id: string) => {
  const result = await prisma.generatedEmail.findUnique({
    where: { id },
    include: {
      generatedCv: true,
      user: true
    }
  });

  if (result?.deletedAt) return null;

  if (result) {
    const emailData: any = result;
    delete emailData.rawEmailResponse;
    return emailData;
  }

  return result;
};

const updateGeneratedEmail = async (id: string, data: any) => {
  const result = await prisma.generatedEmail.update({
    where: { id },
    data,
  });
  return result;
};

const deleteGeneratedEmail = async (id: string) => {
  const result = await prisma.generatedEmail.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });
  return result;
};

const sendGeneratedEmail = async (id: string) => {
  const generatedEmail = await prisma.generatedEmail.findUnique({
    where: { id },
    include: {
      generatedCv: true,
      user: true,
    },
  });

  if (!generatedEmail) {
    throw new ApiError(httpStatus.NOT_FOUND, "Generated email not found");
  }

  const contacts = await prisma.importContact.findMany({
    where: {
      id: { in: generatedEmail.contactIds },
    },
  });

  if (contacts.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No contacts found for this generated email");
  }

  const templatePath = path.join(__dirname, "../../utils/templates/generatedEmail.ejs");

  const results = [];
  for (const contact of contacts) {
    const payload = contact.payload as any;
    // Extract WorkEmail with fallbacks
    const workEmail = payload.WorkEmail || payload.workEmail || payload.Email || payload.email;

    if (!workEmail) {
      console.warn(`No email found for contact ${contact.id}`);
      results.push({ contactId: contact.id, status: 'skipped', reason: 'No email found' });
      continue;
    }

    console.log(`Sending email to: ${workEmail}...`);

    const html = await ejs.renderFile(templatePath, {
      salutation: generatedEmail.salutation,
      introParagraph: generatedEmail.introParagraph,
      keyHighlights: generatedEmail.keyHighlights,
      impactStatement: generatedEmail.impactStatement,
      closingStatement: generatedEmail.closingStatement,
      nbFooter: generatedEmail.nbFooter,
      signatureBlock: generatedEmail.signatureBlock,
      logo: generatedEmail.generatedCv.logo,
      logoEKAI: generatedEmail.logoEKAI,
    });

    const attachments = [];
    let pdfPath = generatedEmail.generatedCv.pdfPath;

    // If generated CV PDF is missing, try to generate it now
    if (!pdfPath) {
      try {
        const updatedCv: any = await generatedCvServices.generateAndSavePdf(generatedEmail.generatedCvId);
        pdfPath = updatedCv.pdfPath;
      } catch (error) {
        console.error("Failed to generate CV PDF on the fly:", error);
        // Fallback to raw CV if generation fails
        pdfPath = generatedEmail.generatedCv.rawPdfPath;
      }
    }

    if (pdfPath) {
      const absolutePdfPath = path.join(process.cwd(), pdfPath);
      if (fs.existsSync(absolutePdfPath)) {
        attachments.push({
          content: fs.readFileSync(absolutePdfPath).toString("base64"),
          filename: `${generatedEmail.generatedCv.firstName}.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        });
      }
    }

    const msg = {
      to: workEmail,
      from: {
        email: config.SENDGRID_FROM_EMAIL || config.EMAIL_FROM || 'noreply@yourdomain.com',
        name: config.SENDGRID_FROM_NAME || 'Edukai',
      },
      replyTo: config.SENDGRID_REPLY_TO_EMAIL || config.EMAIL_FROM,
      subject: generatedEmail.subject || 'Opportunity Brief',
      html: html,
      attachments: attachments,
    };

    try {
      await sgMail.send(msg);
      console.log(`Successfully sent email to: ${workEmail}`);
      // Create log in database
      await prisma.sentEmailLog.create({
        data: {
          generatedEmailId: id,
          userId: generatedEmail.userId,
          contactId: contact.id,
          status: 'sent',
        }
      });
      results.push({ contactId: contact.id, status: 'sent' });
    } catch (error: any) {
      console.error(`Failed to send email to ${workEmail}:`, error.response?.body || error.message);
      // Create failure log in database
      await prisma.sentEmailLog.create({
        data: {
          generatedEmailId: id,
          userId: generatedEmail.userId,
          contactId: contact.id,
          status: 'failed',
          error: error.message,
        }
      });
      results.push({ contactId: contact.id, status: 'failed', error: error.message });
    }
  }

  // Update generated email status if at least one email was sent successfully
  const successfullySent = results.some(r => r.status === 'sent');
  if (successfullySent) {
    await prisma.generatedEmail.update({
      where: { id },
      data: { sendEmail: true }
    });
  }

  // Log the activity
  await activityLogServices.createLog(
    generatedEmail.userId,
    "EMAIL_SENT",
    `Sent generated email to ${results.filter(r => r.status === 'sent').length} contacts.`,
    { generatedEmailId: id, results }
  );

  return results;
};

const getSentEmailLogs = async (generatedEmailId: string) => {
  const result = await prisma.sentEmailLog.findMany({
    where: { generatedEmailId },
    orderBy: { sentAt: 'desc' }
  });

  // Fetch contact details for each log
  const formattedLogs = await Promise.all(result.map(async (log) => {
    const contact = await prisma.importContact.findUnique({
      where: { id: log.contactId }
    });
    return {
      ...log,
      contactDetails: contact ? contact.payload : null
    };
  }));

  return formattedLogs;
};

const getAllSentEmailLogs = async () => {
  const result = await prisma.sentEmailLog.findMany({
    orderBy: { sentAt: 'desc' }
  });

  // Enrich each log with contact details
  const formattedLogs = await Promise.all(result.map(async (log) => {
    const contact = await prisma.importContact.findUnique({
      where: { id: log.contactId }
    });
    return {
      ...log,
      contactDetails: contact ? contact.payload : null
    };
  }));

  return formattedLogs;
};

export const generatedEmailServices = {
  createGeneratedEmail,
  getAllGeneratedEmails,
  getGeneratedEmailById,
  updateGeneratedEmail,
  deleteGeneratedEmail,
  sendGeneratedEmail,
  getSentEmailLogs,
  getAllSentEmailLogs,
};
