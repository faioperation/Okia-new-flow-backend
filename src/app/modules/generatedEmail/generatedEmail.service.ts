import { prisma } from "../../db_connection";
import config from "../../config";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import { activityLogServices } from '../activityLog/activityLog.service';
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

  return result;
};

const getAllGeneratedEmails = async (userId?: string) => {
  const result = await prisma.generatedEmail.findMany({
    where: userId ? { userId, deletedAt: null } : { deletedAt: null },
    
    orderBy: { createdAt: 'desc' }
  });
  return result;
};

const getGeneratedEmailById = async (id: string) => {
  const result = await prisma.generatedEmail.findUnique({
    where: { id },
  });

  if (result?.deletedAt) return null;
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

  const emailPromises = contacts.map(async (contact) => {
    const payload = contact.payload as any;
    // Extract WorkEmail with fallbacks
    const workEmail = payload.WorkEmail || payload.workEmail || payload.Email || payload.email;

    if (!workEmail) {
      console.warn(`No email found for contact ${contact.id}`);
      return { contactId: contact.id, status: 'skipped', reason: 'No email found' };
    }

    const html = await ejs.renderFile(templatePath, {
      salutation: generatedEmail.salutation,
      introParagraph: generatedEmail.introParagraph,
      keyHighlights: generatedEmail.keyHighlights,
      impactStatement: generatedEmail.impactStatement,
      closingStatement: generatedEmail.closingStatement,
      nbFooter: generatedEmail.nbFooter,
      signatureBlock: generatedEmail.signatureBlock,
    });

    const attachments = [];
    if (generatedEmail.generatedCv.pdfPath) {
      const absolutePdfPath = path.join(process.cwd(), generatedEmail.generatedCv.pdfPath);
      if (fs.existsSync(absolutePdfPath)) {
        attachments.push({
          content: fs.readFileSync(absolutePdfPath).toString("base64"),
          filename: `CV-${generatedEmail.generatedCv.firstName}.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        });
      }
    }

    const msg = {
      to: workEmail,
      from: config.SENDGRID_SENDER_EMAIL || config.EMAIL_FROM || 'noreply@yourdomain.com',
      subject: generatedEmail.subject || 'Opportunity Brief',
      html: html,
      attachments: attachments,
    };

    try {
      await sgMail.send(msg);
      // Create log in database
      await prisma.sentEmailLog.create({
        data: {
          generatedEmailId: id,
          userId: generatedEmail.userId,
          contactId: contact.id,
          status: 'sent',
        }
      });
      return { contactId: contact.id, status: 'sent' };
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
      return { contactId: contact.id, status: 'failed', error: error.message };
    }
  });

  const results = await Promise.all(emailPromises);

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

export const generatedEmailServices = {
  createGeneratedEmail,
  getAllGeneratedEmails,
  getGeneratedEmailById,
  updateGeneratedEmail,
  deleteGeneratedEmail,
  sendGeneratedEmail,
};
