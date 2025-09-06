import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import {defineString} from "firebase-functions/params";
import * as admin from "firebase-admin";
import Stripe from "stripe";

// Initialize Firebase Admin
admin.initializeApp();

// Define parameters for environment variables
const stripeSecretKey = defineString("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineString("STRIPE_WEBHOOK_SECRET");

// Initialize Stripe client lazily
let stripe: Stripe;
const getStripe = () => {
    if (!stripe) {
        stripe = new Stripe(stripeSecretKey.value(), {
            apiVersion: "2025-08-27.basil",
        });
    }
    return stripe;
};

// Type definitions for better type safety
interface CreateAccountData {
    country?: string;
    email: string;
}

interface CreateAccountLinkData {
    accountId: string;
    returnUrl?: string;
    refreshUrl?: string;
}

interface GetAccountStatusData {
    accountId: string;
}

interface CreatePaymentIntentData {
    amount: number;
    currency: string;
    connectedAccountId: string;
    applicationFeeAmount?: number;
}

// Create Connect Account
export const createConnectAccount = onCall<CreateAccountData>(
    async (request) => {
        const {email, country} = request.data;
        // Verify user is authenticated
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "User must be authenticated"
            );
        }

        try {
            const account = await getStripe().accounts.create({
                type: "standard", // or 'express' or 'custom'
                country: country || "US",
                email: email,
                capabilities: {
                    card_payments: {requested: true},
                    transfers: {requested: true},
                },
            });

            // Store account ID in Firestore
            const db = admin.firestore();
            await db.collection("users").doc(request.auth.uid).update({
                stripeAccountId: account.id,
                stripeOnboardingComplete: false,
            });

            return {
                accountId: account.id,
                success: true,
            };
        } catch (error) {
            console.error("Error creating Stripe account:", error);
            throw new HttpsError(
                "internal",
                "Failed to create Stripe account"
            );
        }
    }
);

// Create Account Link for Onboarding
export const createAccountLink = onCall<CreateAccountLinkData>(
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "User must be authenticated"
            );
        }

        try {
            const {accountId, returnUrl, refreshUrl} = request.data;

            const accountLink = await getStripe().accountLinks.create({
                account: accountId,
                refresh_url: refreshUrl || "https://finalneon-30e6e.web.app/onboard/refresh",
                return_url: returnUrl || "https://finalneon-30e6e.web.app/onboard/complete",
                type: "account_onboarding",
            });

            return {
                url: accountLink.url,
                success: true,
            };
        } catch (error) {
            console.error("Error creating account link:", error);
            throw new HttpsError(
                "internal",
                "Failed to create account link"
            );
        }
    }
);

// Check Account Status
export const getAccountStatus = onCall<GetAccountStatusData>(
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "User must be authenticated"
            );
        }

        try {
            const {accountId} = request.data;
            const account = await getStripe().accounts.retrieve(accountId);

            return {
                accountId: account.id,
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                detailsSubmitted: account.details_submitted,
                requirements: account.requirements,
                success: true,
            };
        } catch (error) {
            console.error("Error retrieving account:", error);
            throw new HttpsError(
                "internal",
                "Failed to retrieve account"
            );
        }
    }
);

// Create Payment Intent for Connected Account
export const createPaymentIntent = onCall<CreatePaymentIntentData>(
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "User must be authenticated"
            );
        }

        const {amount, currency, connectedAccountId, applicationFeeAmount} = request.data;

        try {
            const paymentIntent = await getStripe().paymentIntents.create({
                amount,
                currency,
                application_fee_amount: applicationFeeAmount, // Your platform fee
                transfer_data: {
                    destination: connectedAccountId,
                },
            });

            return {
                clientSecret: paymentIntent.client_secret,
                success: true,
            };
        } catch (error) {
            console.error("Error creating payment intent:", error);
            throw new HttpsError(
                "internal",
                "Failed to create payment intent"
            );
        }
    }
);

// Webhook handler for Stripe Connect events
export const stripeWebhook = onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event: Stripe.Event;

    try {
        // You'll need to set this webhook secret
        const endpointSecret = stripeWebhookSecret.value();
        event = getStripe().webhooks.constructEvent(
            req.body,
            sig as string,
            endpointSecret
        );
    } catch (err) {
        console.error("Webhook signature verification failed:", err);
        res.status(400).send("Webhook signature verification failed");
        return;
    }

    // Handle different event types
    switch (event.type) {
    case "account.updated": {
        const account = event.data.object as Stripe.Account;
        console.log("Account updated:", account.id);

        // Update your database with account status
        const db = admin.firestore();
        const usersRef = db.collection("users");
        const snapshot = await usersRef.where("stripeAccountId", "==", account.id).get();

        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            await userDoc.ref.update({
                stripeOnboardingComplete: account.details_submitted,
                stripeChargesEnabled: account.charges_enabled,
                stripePayoutsEnabled: account.payouts_enabled,
            });
        }
        break;
    }

    case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment succeeded:", paymentIntent.id);
        // Handle successful payment
        break;
    }

    default: {
        console.log(`Unhandled event type: ${event.type}`);
    }
    }

    res.json({received: true});
});
