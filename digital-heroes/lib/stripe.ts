import Stripe from 'stripe';
/** null when STRIPE_SECRET_KEY is not set -> the app falls back to demo checkout. */
export const stripe: Stripe | null = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
