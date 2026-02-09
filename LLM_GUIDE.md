# Stripe Integration Guide (PAGOS Project)

This document serves as a comprehensive guide for an LLM (or developer) to understand, modify, and extend the current Stripe payment integration.

## Project Overview
This is a simple Node.js + Express backend with a vanilla HTML/JS frontend that demonstrates a Stripe payment flow with **dynamic amounts**.

- **Backend**: `server.js` (Express.js)
- **Frontend**: `public/index.html`, `public/client.js`, `public/style.css`
- **Configuration**: `.env` (Environment variables)

## Directory Structure
```
/Users/user1/Desktop/MAYCODIESEL/PAGOS/
├── server.js           # Backend logic (Payment Intent creation)
├── .env                # Secrets (Stripe Secret Key)
├── package.json        # Dependencies (express, stripe, dotenv, cors)
└── public/             # Frontend assets
    ├── index.html      # Payment UI structure
    ├── client.js       # Stripe.js logic & DOM manipulation
    └── style.css       # Styling
```

## Key Files & Logic

### 1. `server.js` (Backend)
Handles the creation of the **Payment Intent**. It receives the amount from the client, converts it to centavos (Stripe's currency unit), and requests a `clientSecret` from Stripe.

```javascript
/* server.js */
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

// Initialize Stripe with Secret Key
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(express.static("public"));
app.use(express.json());
app.use(cors());

app.post("/create-payment-intent", async (req, res) => {
  const { amount } = req.body;

  // Convert amount to cents (e.g., $100.00 -> 10000)
  const amountInCents = Math.round(Number(amount) * 100);

  // Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "mxn",
    automatic_payment_methods: {
      enabled: true,
    },
  });

  // Return the secret to the client
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

app.listen(4242, () => console.log("Node server listening on port 4242!"));
```

### 2. `public/client.js` (Frontend Logic)
Handles the user interaction. The flow is:
1. User enters amount.
2. User clicks "Cargar botón de pago".
3. Frontend calls `/create-payment-intent` with the amount.
4. Backend returns `clientSecret`.
5. Frontend uses `stripe.elements()` with the secret to mount the credit card form.
6. User clicks "Pagar ahora" -> `stripe.confirmPayment()`.

```javascript
/* public/client.js (Key snippets) */
const stripe = Stripe("pk_test_..."); // Publishable Key

// Load Payment Button Event
document.querySelector("#load-payment").addEventListener("click", () => {
    const amount = document.querySelector("#custom-amount").value;
    if (amount > 0) {
        initialize(amount); // Initialize Stripe with this amount
        // UI updates...
    } else {
        alert("Por favor ingresa un monto válido");
    }
});

async function initialize(amount) {
    const response = await fetch("/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
    });
    const { clientSecret } = await response.json();
    
    // Mount Stripe Elements
    elements = stripe.elements({ appearance: { theme: 'stripe' }, clientSecret });
    const paymentElement = elements.create("payment", { layout: "tabs" });
    paymentElement.mount("#payment-element");
}

async function handleSubmit(e) {
    // ... stripe.confirmPayment logic ...
}
```

### 3. `.env` (Configuration)
Contains the sensitive API keys.

```env
STRIPE_SECRET_KEY=sk_test_...
```

## How to Run
1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start the server**:
    ```bash
    node server.js
    ```
3.  **Access**:
    Open `http://localhost:4242` in your browser.

## Testing
Use Stripe Test Cards (Live cards will be declined in Test Mode):
-   **Success**: `4242 4242 4242 4242` (Any future date, any CVC)

## Integration Nuances
-   **No Database Sync Required**: This system is designed to be decoupled from the inventory. The application (ERM) calculates the total and tells Stripe only *how much* to charge.
-   **Security**: The actual credit card numbers never touch the backend server. They go directly from the frontend to Stripe. The backend only handles the intent creation and validation of the amount.
