// new 

import PDFDocument from 'pdfkit';
import { Writable } from 'stream';
import axios from 'axios';

export const generateCvPdf = async (cvData: any, outputStream: Writable) => {
  const margin = 70;

  const doc = new PDFDocument({
    margin,
    size: 'A4',
  });

  doc.pipe(outputStream);

  // COLORS
  const primaryColor = '#000000';
  const secondaryColor = '#444444';
  const accentColor = '#D35400';
  const dividerColor = '#cccccc';

  const pageWidth = doc.page.width;
  const rightMarginEnd = pageWidth - margin;

  // ---------------- HEADER ----------------

  if (cvData.logo) {
    try {
      const response = await axios.get(cvData.logo, {
        responseType: 'arraybuffer',
      });

      const logoBuffer = Buffer.from(response.data, 'utf-8');

      const logoWidth = 160;
      const logoHeight = 40;
      const xPos = (pageWidth - logoWidth) / 2;

      doc.image(logoBuffer, xPos, doc.y, {
        width: logoWidth,
        height: logoHeight,
      });

      // ✅ FIX: prevent overlap
      doc.y += logoHeight + 12;

    } catch { }
  }

  // NAME
  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .fillColor(primaryColor)
    .text(cvData.firstName || 'Name', { align: 'center' });

  doc.moveDown(0.5);

  // TITLE
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor(secondaryColor)
    .text(cvData.professionalTitle || '', { align: 'center' });

  doc.moveDown(0.2);

  // EXPERTISE
  if (cvData.expertise) {
    const expertiseItems = Array.isArray(cvData.expertise) ? cvData.expertise : [];
    if (expertiseItems.length > 0) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(primaryColor)
        .text(expertiseItems.join(' | '), { align: 'center' });
      doc.moveDown(0.3);
    }
  }

  doc.moveDown(0.3);

  // LOCATION
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(primaryColor)
    .text(`Location: ${cvData.location || ''}`, { align: 'center' });

  doc.moveDown(0.3);

  // CONTACT
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(primaryColor)
    .text(`Contact: ${cvData.contactDetails || ''}`, { align: 'center' });

  doc.moveDown(0.8);

  // ACCENT LINE
  doc
    .strokeColor(accentColor)
    .lineWidth(1.5)
    .moveTo(margin, doc.y)
    .lineTo(rightMarginEnd, doc.y)
    .stroke();

  doc.moveDown(1);

  // ---------------- SECTION HEADER ----------------

  const drawSectionHeader = (title: string) => {
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text(title);

    doc.moveDown(0.2);

    doc
      .strokeColor(dividerColor)
      .lineWidth(0.6)
      .moveTo(margin, doc.y)
      .lineTo(rightMarginEnd, doc.y)
      .stroke();

    doc.moveDown(0.6);
  };

  // ---------------- PROFILE ----------------

  if (cvData.profileContent) {
    drawSectionHeader('Professional Profile');

    doc
      .fontSize(10.5)
      .font('Helvetica')
      .fillColor(secondaryColor)
      .text(cvData.profileContent, {
        align: 'justify',
        lineGap: 4,
      });

    doc.moveDown(1);
  }

  // ---------------- SKILLS ----------------

  if (cvData.skills) {
    const skills = typeof cvData.skills === 'string' ? JSON.parse(cvData.skills) : cvData.skills;
    const title = skills.title || 'Skills';
    const items = skills.items || [];

    if (items.length > 0) {
      drawSectionHeader(title);

      doc
        .fontSize(10.5)
        .font('Helvetica')
        .fillColor(secondaryColor)
        .text(items.join(', '), {
          align: 'justify',
          lineGap: 4,
        });

      doc.moveDown(1);
    }
  }

  // ---------------- EMPLOYMENT ----------------

  if (cvData.jobs?.length) {
    drawSectionHeader('Employment History');

    cvData.jobs.forEach((job: any) => {
      const startY = doc.y;

      // LEFT TITLE
      doc
        .fontSize(10.5)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(`${job.company} | ${job.role}`, margin, startY);

      // RIGHT DATE
      doc
        .fontSize(9.5)
        .font('Helvetica-Oblique')
        .fillColor(secondaryColor)
        .text(job.period || '', margin, startY, {
          align: 'right',
          width: rightMarginEnd - margin,
        });

      doc.moveDown(0.5);

      // RESPONSIBILITIES (✅ FLAT + PERFECT ALIGN)
      let items: string[] = [];
      try {
        items = Array.isArray(job.responsibilities)
          ? job.responsibilities
          : JSON.parse(job.responsibilities || '[]');
      } catch {
        items = [];
      }

      items.forEach((item: string) => {
        const bulletX = margin;
        const textX = margin + 12;
        const y = doc.y;

        // bullet
        doc
          .fontSize(10.5)
          .font('Helvetica')
          .fillColor(secondaryColor)
          .text('•', bulletX, y);

        // text
        doc.text(item, textX, y, {
          width: rightMarginEnd - textX,
          lineGap: 3,
        });

        doc.moveDown(0.5);
      });

      doc.moveDown(0.8);
    });
  }

  // ---------------- EDUCATION ----------------

  if (cvData.educations?.length) {
    doc.x = margin; // ✅ FORCE LEFT ALIGN
    drawSectionHeader('Education & Qualifications');

    doc
      .fontSize(10.5)
      .font('Helvetica')
      .fillColor(secondaryColor);

    cvData.educations.forEach((edu: any) => {
      doc.x = margin; // ✅ IMPORTANT (inside loop)

      const bulletX = margin;
      const textX = margin + 12;
      const y = doc.y;

      // bullet
      doc.text('•', bulletX, y);

      // text
      doc.text(edu.title, textX, y, {
        width: rightMarginEnd - textX,
        lineGap: 3,
      });

      doc.moveDown(0.5);
    });

    doc.moveDown(1);
  }

  // ---------------- FOOTER ----------------


  doc.x = margin; // ✅ FORCE LEFT ALIGN

  doc
    .fontSize(10.5)
    .font('Helvetica-Bold')
    .fillColor(primaryColor)
    .text('References available upon request');

  doc.moveDown(2);


  
  doc.end();
};