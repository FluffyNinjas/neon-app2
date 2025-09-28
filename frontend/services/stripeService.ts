import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/FirebaseConfig";

// Initialize Firebase Functions
const functions = getFunctions(app, 'us-central1');

// Create Connect Account
export const createConnectAccount = async (email: string, country?: string) => {
  const fn = httpsCallable(functions, "createConnectAccount");
  const res = await fn({ email, country });
  return res.data as { accountId: string; success: boolean };
};

// Create Onboarding Link
export const createAccountLink = async (accountId: string) => {
  const fn = httpsCallable(functions, "createAccountLink");
  const res = await fn({ accountId });
  return res.data as { url: string; success: boolean };
};

// Get Account Status
export const getAccountStatus = async (accountId: string) => {
  const fn = httpsCallable(functions, "getAccountStatus");
  const res = await fn({ accountId });
  return res.data;
};

// Create Payment Intent
export const createPaymentIntent = async (
  amount: number,
  currency: string,
  connectedAccountId: string,
  applicationFeeAmount?: number
) => {
  const fn = httpsCallable(functions, "createPaymentIntent");
  const res = await fn({ amount, currency, connectedAccountId, applicationFeeAmount });
  return res.data as { clientSecret: string; success: boolean };
};
