export interface IParsedCandidate {
  candidateName: string;
  emailAddress: string;
  contactNumber: string;
  jobTitle: string;
  address: string;
  experienceYears: number;
  professionalProfile: string;
  skills: string[];
  education: { degreeName: string; institutionName: string; startYear: number; endYear: number }[];
  employment: { companyName: string; jobTitle: string; startDate: string; endDate: string; responsibilities: string }[];
}

export const parseCandidateData = (text: string): IParsedCandidate => {
  // 1. Pre-process text: Clean excessive whitespace but keep structure
  const cleanText = text.replace(/[ \t]+/g, ' ').trim();
  const lines = cleanText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);

  // 2. Section Detection (Heuristics)
  const sections: Record<string, string[]> = {
    header: [],
    experience: [],
    education: [],
    skills: [],
    summary: []
  };

  let currentSection = 'header';
  const sectionKeywords: Record<string, RegExp> = {
    experience: /(experience|employment|work history|career history|professional history)/i,
    education: /(education|qualifications|academic|university|college)/i,
    skills: /(skills|competencies|technologies|technical expertise)/i,
    summary: /(profile|summary|about me|objective|professional profile)/i
  };

  for (const line of lines) {
    let switched = false;
    for (const [key, regex] of Object.entries(sectionKeywords)) {
      if (regex.test(line) && line.length < 30) {
        currentSection = key;
        switched = true;
        break;
      }
    }
    if (!switched) {
      sections[currentSection].push(line);
    }
  }

  // 3. Extraction Logic
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
  const phoneRegex = /(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/;

  // Name: Heuristic - often first line of header or near "Name"
  let name = "Unknown Candidate";
  if (sections.header.length > 0) {
    const firstFewHeader = sections.header.slice(0, 3);
    const nameMatch = firstFewHeader.find(l => !emailRegex.test(l) && !phoneRegex.test(l) && l.length > 3 && l.length < 50);
    if (nameMatch) name = nameMatch;
  }

  const email = cleanText.match(emailRegex)?.[0] || "";
  const phone = cleanText.match(phoneRegex)?.[0] || "";

  // Skills
  const commonSkills = ["JavaScript", "TypeScript", "Node.js", "React", "Python", "Java", "SQL", "Docker", "AWS", "Prisma", "Express", "HTML", "CSS", "Next.js", "Tailwind", "Git"];
  const detectedSkills = commonSkills.filter(skill => 
    new RegExp(`\\b${skill}\\b`, 'i').test(cleanText)
  );

  // Experience Years
  const expMatch = cleanText.match(/(\d+(\.\d+)?)\s*(year|yr)/i);
  const expYears = expMatch ? parseFloat(expMatch[1]) : 0;

  // Job Title: Most recent title in experience section
  let jobTitle = "";
  if (sections.experience.length > 0) {
    const jobTitleKeywords = ["Software Engineer", "Developer", "Manager", "Analyst", "Lead", "Consultant", "Director"];
    jobTitle = sections.experience.find(l => jobTitleKeywords.some(kw => l.includes(kw))) || "";
  }

  return {
    candidateName: name.substring(0, 255),
    emailAddress: email,
    contactNumber: phone,
    jobTitle: jobTitle.substring(0, 255),
    address: "",
    experienceYears: expYears,
    professionalProfile: sections.summary.join(' ').substring(0, 1000) || sections.header.join(' ').substring(0, 1000),
    skills: detectedSkills,
    education: [], 
    employment: [] 
  };
};
