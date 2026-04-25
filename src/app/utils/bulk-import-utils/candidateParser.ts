export interface IParsedCandidate {
  candidate_name: string;
  contact: {
    email: string;
    phone: string;
    location: string;
    linkedin: string | null;
  };
  professional_summary: string;
  total_years_experience: number;
  top_skills: string[];
  education: {
    degree: string;
    institution: string;
    passing_year: string;
    result: string | null;
  }[];
  employment_history: {
    job_title: string;
    company: string;
    period: string;
    responsibilities: string[];
  }[];
  projects_and_certifications: string[];
}

export const parseCandidateData = async (text: string): Promise<IParsedCandidate> => {
  // 1. Cleaning and Pre-processing
  const cleanText = text.replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
  const lines = cleanText.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);

  // 2. Initial Data Extraction
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
  const phoneRegex = /(\+?880?[-.\s]?\d{1,4}?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4})|(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/;
  const linkedinRegex = /(linkedin\.com\/in\/[a-zA-Z0-9_-]+)/;

  const email = cleanText.match(emailRegex)?.[0] || "";
  let phone = cleanText.match(phoneRegex)?.[0] || "";
  const linkedin = cleanText.match(linkedinRegex)?.[0] || null;

  // Normalize phone to +880 if it starts with 01
  if (phone.startsWith('01') && phone.length === 11) {
    phone = '+88' + phone;
  }

  // 3. Section Splitting (Heuristics)
  const sections: Record<string, string[]> = {
    header: [],
    experience: [],
    education: [],
    skills: [],
    summary: [],
    others: []
  };

  let currentSection = 'header';
  const sectionKeywords: Record<string, RegExp> = {
    experience: /^(experience|employment|work history|career history|professional history|professional experience|work experience)/i,
    education: /^(education|qualifications|academic|university|college|academic background)/i,
    skills: /^(skills|competencies|technologies|technical expertise|professional skills|technical skills)/i,
    summary: /^(profile|summary|about me|objective|professional profile|professional summary)/i,
    others: /^(projects|certifications|awards|achievements|languages|references)/i
  };

  for (const line of lines) {
    let switched = false;
    for (const [key, regex] of Object.entries(sectionKeywords)) {
      if (regex.test(line) && line.length < 40) {
        currentSection = key;
        switched = true;
        break;
      }
    }
    if (!switched) {
      sections[currentSection].push(line);
    }
  }

  // 4. Candidate Name: Usually the first non-contact line in header
  let name = "Unknown Candidate";
  if (sections.header.length > 0) {
    const nameMatch = sections.header.find(l => 
      !emailRegex.test(l) && 
      !phoneRegex.test(l) && 
      !/address|location|linkedin|github/i.test(l) &&
      l.length > 3 && l.length < 50
    );
    if (nameMatch) name = nameMatch;
  }

  // 5. Total Years Experience (Calculation from text)
  let expYears = 0;
  const expYearMatch = cleanText.match(/(\d+(\.\d+)?)\s*(year|yr)/i);
  if (expYearMatch) {
    expYears = Math.round(parseFloat(expYearMatch[1]));
  } else {
    // Try to find dates like 2017 - 2024
    const dateMatches = cleanText.matchAll(/(\d{4})\s*[-–—]\s*(\d{4}|present)/gi);
    let minYear = new Date().getFullYear();
    let maxYear = 0;
    for (const match of dateMatches) {
      const start = parseInt(match[1]);
      const end = match[2].toLowerCase() === 'present' ? new Date().getFullYear() : parseInt(match[2]);
      if (start < minYear) minYear = start;
      if (end > maxYear) maxYear = end;
    }
    if (maxYear > 0) {
      expYears = maxYear - minYear;
    }
  }

  // 6. Skills extraction
  const commonSkills = ["JavaScript", "TypeScript", "Node.js", "React", "Python", "Java", "SQL", "Docker", "AWS", "HTML", "CSS", "Next.js", "Tailwind", "Git", "PHP", "Laravel", "MySQL", "PostgreSQL", "MongoDB", "Express", "REST API", "Redux", "Flutter", "Dart", "C++", "C#", "Firebase"];
  
  const detectedSkills = commonSkills.filter(skill => {
    // Escape special regex characters like +, #, etc.
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escapedSkill}\\b`, 'i').test(cleanText);
  });

  // 7. Education extraction (Simple logic)
  const education: IParsedCandidate['education'] = [];
  if (sections.education.length > 0) {
    let currentEdu: any = null;
    for (const line of sections.education) {
      if (/BSc|MSc|BBA|MBA|Bachelor|Master|Diploma|SSC|HSC|University|College|School/i.test(line)) {
        if (currentEdu) education.push(currentEdu);
        currentEdu = { degree: line, institution: "Unknown Institution", passing_year: "null", result: null };
      } else if (currentEdu && /\d{4}/.test(line)) {
        currentEdu.passing_year = line.match(/\d{4}/)?.[0] || "null";
      } else if (currentEdu && currentEdu.institution === "Unknown Institution") {
        currentEdu.institution = line;
      }
    }
    if (currentEdu) education.push(currentEdu);
  }

  // 8. Employment History extraction
  const employment: IParsedCandidate['employment_history'] = [];
  if (sections.experience.length > 0) {
    let currentJob: any = null;
    for (const line of sections.experience) {
      if (line.length < 50 && (/Engineer|Developer|Manager|Analyst|Intern|Lead|Officer|Executive|Consultant/i.test(line))) {
        if (currentJob) employment.push(currentJob);
        currentJob = { job_title: line, company: "Unknown Company", period: "null", responsibilities: [] };
      } else if (currentJob && /(\d{4})\s*[-–—]\s*(\d{4}|present)/i.test(line)) {
        currentJob.period = line;
      } else if (currentJob && currentJob.company === "Unknown Company") {
        currentJob.company = line;
      } else if (currentJob) {
        currentJob.responsibilities.push(line);
      }
    }
    if (currentJob) employment.push(currentJob);
  }

  return {
    candidate_name: name,
    contact: {
      email: email,
      phone: phone,
      location: sections.header.find(l => /address|location|dhaka|bangladesh/i.test(l)) || "null",
      linkedin: linkedin
    },
    professional_summary: sections.summary.join(' ') || sections.header.join(' '),
    total_years_experience: expYears,
    top_skills: detectedSkills.length > 0 ? detectedSkills : sections.skills,
    education: education,
    employment_history: employment,
    projects_and_certifications: sections.others
  };
};


