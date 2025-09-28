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
        stripe = new Stripe(stripeSecretKey.value());
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
    bookingId: string;
}


interface RefundPaymentData {
    paymentIntentId: string;
    bookingId: string;
    reason?: string;
}

interface AcceptBookingData {
    bookingId: string;
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

        const {amount, currency, connectedAccountId, applicationFeeAmount, bookingId} = request.data;

        try {
            const paymentIntent = await getStripe().paymentIntents.create({
                amount,
                currency,
                application_fee_amount: applicationFeeAmount || Math.floor(amount * 0.05), // 5% platform fee
                transfer_data: {
                    destination: connectedAccountId,
                },
                capture_method: "manual", // Hold payment until booking is accepted
                metadata: {
                    bookingId: bookingId,
                    type: "screen_booking",
                },
            });

            // Update booking with payment intent
            const db = admin.firestore();
            await db.collection("bookings").doc(bookingId).update({
                paymentIntentId: paymentIntent.id,
                paymentStatus: "payment_intent_created",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
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

// Accept Booking and Capture Payment
export const acceptBooking = onCall<AcceptBookingData>(
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "User must be authenticated"
            );
        }

        const {bookingId} = request.data;
        const db = admin.firestore();

        try {
            // Get booking details
            const bookingRef = db.collection("bookings").doc(bookingId);
            const bookingDoc = await bookingRef.get();

            if (!bookingDoc.exists) {
                throw new HttpsError("not-found", "Booking not found");
            }

            const booking = bookingDoc.data();

            // Verify user is the screen owner
            const screenDoc = await db.collection("screens").doc(booking?.screenId).get();
            if (!screenDoc.exists || screenDoc.data()?.ownerId !== request.auth.uid) {
                throw new HttpsError("permission-denied", "Not authorized to accept this booking");
            }

            // Verify booking is in requested status
            if (booking?.status !== "requested") {
                throw new HttpsError("failed-precondition", "Booking is not in requested status");
            }

            // Capture the payment
            if (booking?.paymentIntentId) {
                const paymentIntent = await getStripe().paymentIntents.capture(booking.paymentIntentId);

                // Update booking status
                await bookingRef.update({
                    status: "accepted",
                    paymentStatus: "captured",
                    acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                return {
                    success: true,
                    paymentIntentId: paymentIntent.id,
                    status: "accepted",
                };
            } else {
                throw new HttpsError("failed-precondition", "No payment intent found for booking");
            }
        } catch (error) {
            console.error("Error accepting booking:", error);
            throw new HttpsError(
                "internal",
                "Failed to accept booking"
            );
        }
    }
);

// Decline Booking and Refund Payment
export const declineBooking = onCall<AcceptBookingData>(
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "User must be authenticated"
            );
        }

        const {bookingId} = request.data;
        const db = admin.firestore();

        try {
            // Get booking details
            const bookingRef = db.collection("bookings").doc(bookingId);
            const bookingDoc = await bookingRef.get();

            if (!bookingDoc.exists) {
                throw new HttpsError("not-found", "Booking not found");
            }

            const booking = bookingDoc.data();

            // Verify user is the screen owner
            const screenDoc = await db.collection("screens").doc(booking?.screenId).get();
            if (!screenDoc.exists || screenDoc.data()?.ownerId !== request.auth.uid) {
                throw new HttpsError("permission-denied", "Not authorized to decline this booking");
            }

            // Cancel the payment intent (releases the hold)
            if (booking?.paymentIntentId) {
                await getStripe().paymentIntents.cancel(booking.paymentIntentId);

                // Update booking status
                await bookingRef.update({
                    status: "declined",
                    paymentStatus: "cancelled",
                    declinedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                return {
                    success: true,
                    paymentIntentId: booking.paymentIntentId,
                    status: "declined",
                };
            } else {
                // No payment to cancel, just update status
                await bookingRef.update({
                    status: "declined",
                    declinedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                return {
                    success: true,
                    status: "declined",
                };
            }
        } catch (error) {
            console.error("Error declining booking:", error);
            throw new HttpsError(
                "internal",
                "Failed to decline booking"
            );
        }
    }
);

// Cancel Booking and Process Refund
export const cancelBooking = onCall<RefundPaymentData>(
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "User must be authenticated"
            );
        }

        const {bookingId, reason} = request.data;
        const db = admin.firestore();

        try {
            // Get booking details
            const bookingRef = db.collection("bookings").doc(bookingId);
            const bookingDoc = await bookingRef.get();

            if (!bookingDoc.exists) {
                throw new HttpsError("not-found", "Booking not found");
            }

            const booking = bookingDoc.data();

            // Verify user is authorized (owner or renter)
            const screenDoc = await db.collection("screens").doc(booking?.screenId).get();
            const isOwner = screenDoc.data()?.ownerId === request.auth.uid;
            const isRenter = booking?.userId === request.auth.uid;

            if (!isOwner && !isRenter) {
                throw new HttpsError("permission-denied", "Not authorized to cancel this booking");
            }

            // Check if booking can be cancelled (not live or completed)
            if (booking?.status === "live" || booking?.status === "completed") {
                throw new HttpsError("failed-precondition", "Cannot cancel live or completed booking");
            }

            // Process refund if payment was captured
            if (booking?.paymentIntentId && booking?.paymentStatus === "captured") {
                const refund = await getStripe().refunds.create({
                    payment_intent: booking.paymentIntentId,
                    reason: "requested_by_customer",
                    metadata: {
                        bookingId: bookingId,
                        cancelledBy: request.auth.uid,
                        reason: reason || "cancelled",
                    },
                });

                // Update booking status
                await bookingRef.update({
                    status: "cancelled",
                    paymentStatus: "refunded",
                    refundId: refund.id,
                    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                    cancelledBy: request.auth.uid,
                    cancellationReason: reason,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                return {
                    success: true,
                    refundId: refund.id,
                    status: "cancelled",
                };
            } else if (booking?.paymentIntentId && booking?.paymentStatus !== "captured") {
                // Cancel uncaptured payment intent
                await getStripe().paymentIntents.cancel(booking.paymentIntentId);

                await bookingRef.update({
                    status: "cancelled",
                    paymentStatus: "cancelled",
                    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                    cancelledBy: request.auth.uid,
                    cancellationReason: reason,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                return {
                    success: true,
                    status: "cancelled",
                };
            } else {
                // No payment to process, just update status
                await bookingRef.update({
                    status: "cancelled",
                    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                    cancelledBy: request.auth.uid,
                    cancellationReason: reason,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                return {
                    success: true,
                    status: "cancelled",
                };
            }
        } catch (error) {
            console.error("Error cancelling booking:", error);
            throw new HttpsError(
                "internal",
                "Failed to cancel booking"
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
