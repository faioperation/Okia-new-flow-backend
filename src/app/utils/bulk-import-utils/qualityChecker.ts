export type TQualityStatus = 'quality_passed' | 'quality_failed' | 'manual_review';

export interface IQualityCheckCriteria {
  minimumYearsExperience: number;
  requiredSkills: string[];
  jobRole: string;
  checkFormatting?: boolean;
}

export const checkCandidateQuality = (
  candidate: any,
  criteria: IQualityCheckCriteria
): TQualityStatus => {
  const { minimumYearsExperience, requiredSkills, jobRole } = criteria;

  // Uncertainty logic: if name or email is missing
  if (!candidate.candidateName || !candidate.emailAddress) {
    return 'manual_review';
  }

  const expPass = candidate.experienceYears >= minimumYearsExperience;
  
  // Skill check
  const candidateSkills = candidate.skills.map((s: string) => s.toLowerCase());
  const skillPass = requiredSkills.every(skill => 
    candidateSkills.includes(skill.toLowerCase())
  );

  // Role check
  const rolePass = candidate.jobTitle.toLowerCase().includes(jobRole.toLowerCase());

  if (expPass && skillPass && rolePass) {
    return 'quality_passed';
  }

  return 'quality_failed';
};
