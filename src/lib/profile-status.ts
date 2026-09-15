import type { EmploymentStatus } from "@/types/database";

interface RequiredFields {
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  employment_status: EmploymentStatus | null;
  monthly_income: number | null;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
}

/**
 * A borrower must fill in all of these before they can apply for a loan.
 * Deliberately excludes `gender` (the profile form offers "Prefer not to
 * say", which stores null — requiring it here would defeat that option)
 * and `employer_name` (not everyone has one — unemployed/student/retired
 * are valid employment_status values with no employer).
 */
export function isProfileComplete(profile: Partial<RequiredFields> | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.phone &&
      profile.date_of_birth &&
      profile.address &&
      profile.city &&
      profile.state &&
      profile.employment_status &&
      profile.monthly_income != null &&
      profile.bank_name &&
      profile.account_name &&
      profile.account_number &&
      profile.emergency_contact_name &&
      profile.emergency_contact_phone &&
      profile.emergency_contact_relationship
  );
}