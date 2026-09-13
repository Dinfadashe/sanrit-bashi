// Hand-written to match supabase/migrations/0001_init_schema.sql.
// Once you have a live Supabase project, you can regenerate this with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
// and it will be a drop-in replacement (same shape).

export type AdminRole = "super_admin" | "loan_officer" | "finance_officer";

export type KycStatus = "not_submitted" | "nin_verified" | "verified" | "mismatch" | "failed";

export type LoanApplicationStatus =
  | "draft"
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "cancelled";

export type LoanStatus =
  | "approved"
  | "disbursed"
  | "active"
  | "completed"
  | "defaulted"
  | "cancelled";

export type ScheduleStatus = "pending" | "partial" | "paid" | "overdue";
export type PaymentStatus = "pending" | "successful" | "failed" | "reversed";
export type PaymentMethod = "bank_transfer" | "cash" | "paystack" | "other";
export type EmploymentStatus =
  | "employed"
  | "self_employed"
  | "business_owner"
  | "unemployed"
  | "student"
  | "retired";

export type NotificationType =
  | "application_submitted"
  | "application_under_review"
  | "loan_approved"
  | "loan_rejected"
  | "loan_disbursed"
  | "payment_received"
  | "payment_reminder"
  | "loan_completed"
  | "general";

export type ProfileRow = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  employment_status: EmploymentStatus | null;
  employer_name: string | null;
  monthly_income: number | null;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  credit_limit: number | null;
  nin: string | null;
  nin_verified_at: string | null;
  nin_verified_full_name: string | null;
  nin_verified_date_of_birth: string | null;
  bvn: string | null;
  bvn_verified_at: string | null;
  bvn_verified_full_name: string | null;
  bvn_verified_date_of_birth: string | null;
  kyc_status: KycStatus;
  kyc_reviewed_by: string | null;
  kyc_notes: string | null;
  liveness_photo_path: string | null;
  liveness_captured_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AdminUserRow = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type LoanProductRow = {
  id: string;
  name: string;
  description: string | null;
  minimum_amount: number;
  maximum_amount: number;
  interest_rate: number; // flat % PER MONTH
  processing_fee_rate: number; // % of principal
  minimum_duration: number;
  maximum_duration: number;
  repayment_frequency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type LoanApplicationRow = {
  id: string;
  user_id: string;
  loan_product_id: string;
  amount: number;
  duration: number;
  purpose: string;
  interest_rate: number;
  processing_fee_rate: number;
  processing_fee: number;
  interest_amount: number;
  total_repayment: number;
  status: LoanApplicationStatus;
  rejection_reason: string | null;
  next_of_kin_full_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_relationship: string | null;
  next_of_kin_address: string | null;
  guarantor_full_name: string | null;
  guarantor_phone: string | null;
  guarantor_relationship: string | null;
  guarantor_address: string | null;
  guarantor_occupation: string | null;
  disbursement_bank_name: string | null;
  disbursement_account_name: string | null;
  disbursement_account_number: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export type LoanRow = {
  id: string;
  application_id: string;
  user_id: string;
  loan_product_id: string;
  principal_amount: number;
  interest_rate: number;
  interest_amount: number;
  processing_fee: number;
  total_repayment: number;
  amount_repaid: number;
  outstanding_balance: number;
  duration: number;
  status: LoanStatus;
  approved_at: string | null;
  approved_by: string | null;
  disbursed_at: string | null;
  disbursed_amount: number | null;
  disbursement_reference: string | null;
  disbursement_method: string | null;
  completed_at: string | null;
  credit_rating: number | null;
  next_of_kin_full_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_relationship: string | null;
  next_of_kin_address: string | null;
  guarantor_full_name: string | null;
  guarantor_phone: string | null;
  guarantor_relationship: string | null;
  guarantor_address: string | null;
  guarantor_occupation: string | null;
  disbursement_bank_name: string | null;
  disbursement_account_name: string | null;
  disbursement_account_number: string | null;
  disbursement_receipt_path: string | null;
  created_at: string;
  updated_at: string;
}

export type RepaymentScheduleRow = {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: ScheduleStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentRow = {
  id: string;
  loan_id: string;
  user_id: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_reference: string;
  status: PaymentStatus;
  payment_date: string;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export type AuditLogRow = {
  id: string;
  admin_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  created_at: string;
}

// Generic helper: a table definition for the supabase-js client generic.
// Insert/Update are intentionally permissive (Partial) — every write path in
// this app goes through a validated server action, not a raw client insert,
// so the runtime validation (zod + the DB constraints/RLS) is the real guard.
// `Relationships` is required by @supabase/postgrest-js's GenericTable shape
// even though we don't use the nested-relation select syntax here.
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      admin_users: Table<AdminUserRow>;
      loan_products: Table<LoanProductRow>;
      loan_applications: Table<LoanApplicationRow>;
      loans: Table<LoanRow>;
      repayment_schedules: Table<RepaymentScheduleRow>;
      payments: Table<PaymentRow>;
      notifications: Table<NotificationRow>;
      audit_logs: Table<AuditLogRow>;
    };
    Views: Record<string, never>;
    Functions: {
      record_payment: {
        Args: {
          p_loan_id: string;
          p_amount: number;
          p_payment_method: PaymentMethod;
          p_transaction_reference: string;
          p_recorded_by: string | null;
          p_notes?: string | null;
          p_payment_date?: string;
        };
        Returns: string;
      };
      mark_overdue_schedules: {
        Args: Record<string, never>;
        Returns: void;
      };
      rate_loan: {
        Args: {
          p_loan_id: string;
          p_rating: number;
          p_admin_id: string;
        };
        Returns: number | null;
      };
    };
  };
}