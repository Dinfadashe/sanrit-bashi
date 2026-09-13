"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/auth";
import type { ProfileRow } from "@/types/database";
import { Card, Alert } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = {};

export function ProfileForm({ profile }: { profile: ProfileRow }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state?.success && <Alert variant="success">Profile updated.</Alert>}
      {state?.error && <Alert variant="error">{state.error}</Alert>}

      <Card>
        <h2 className="mb-4 font-semibold text-brand-navy">Personal Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fullName" required>Full name</Label>
            <Input id="fullName" name="fullName" defaultValue={profile.full_name} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} />
          </div>
          <div>
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={profile.date_of_birth ?? ""} />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select id="gender" name="gender" defaultValue={profile.gender ?? ""}>
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={profile.address ?? ""} />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={profile.city ?? ""} />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" defaultValue={profile.state ?? ""} />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-brand-navy">Employment / Income</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="employmentStatus">Employment status</Label>
            <Select id="employmentStatus" name="employmentStatus" defaultValue={profile.employment_status ?? ""}>
              <option value="">Select</option>
              <option value="employed">Employed</option>
              <option value="self_employed">Self-employed</option>
              <option value="business_owner">Business owner</option>
              <option value="unemployed">Unemployed</option>
              <option value="student">Student</option>
              <option value="retired">Retired</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="employerName">Employer / business name</Label>
            <Input id="employerName" name="employerName" defaultValue={profile.employer_name ?? ""} />
          </div>
          <div>
            <Label htmlFor="monthlyIncome">Monthly income (₦)</Label>
            <Input
              id="monthlyIncome"
              name="monthlyIncome"
              type="number"
              min={0}
              step={1000}
              defaultValue={profile.monthly_income ?? ""}
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-brand-navy">Bank Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="bankName">Bank name</Label>
            <Input id="bankName" name="bankName" defaultValue={profile.bank_name ?? ""} />
          </div>
          <div>
            <Label htmlFor="accountName">Account name</Label>
            <Input id="accountName" name="accountName" defaultValue={profile.account_name ?? ""} />
          </div>
          <div>
            <Label htmlFor="accountNumber">Account number</Label>
            <Input id="accountNumber" name="accountNumber" defaultValue={profile.account_number ?? ""} />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-brand-navy">Emergency Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="emergencyContactName">Name</Label>
            <Input id="emergencyContactName" name="emergencyContactName" defaultValue={profile.emergency_contact_name ?? ""} />
          </div>
          <div>
            <Label htmlFor="emergencyContactPhone">Phone</Label>
            <Input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={profile.emergency_contact_phone ?? ""} />
          </div>
          <div>
            <Label htmlFor="emergencyContactRelationship">Relationship</Label>
            <Input
              id="emergencyContactRelationship"
              name="emergencyContactRelationship"
              defaultValue={profile.emergency_contact_relationship ?? ""}
            />
          </div>
        </div>
      </Card>

      <Button type="submit" loading={pending}>
        Save profile
      </Button>
    </form>
  );
}
