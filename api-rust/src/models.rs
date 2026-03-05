use serde::{Deserialize, Serialize};

// --- Auth ---
#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
    pub email: String,
}

#[derive(Serialize)]
pub struct UserResponse {
    pub id: serde_json::Value,
    pub username: String,
    pub role: String,
    pub email: Option<String>,
}

// --- Products ---
#[derive(Deserialize)]
pub struct ProductQuery {
    #[serde(rename = "engineId")]
    pub engine_id: Option<String>,
    #[serde(rename = "categoryId")]
    pub category_id: Option<String>,
    pub search: Option<String>,
}

#[derive(Deserialize)]
pub struct ProductUpdate {
    pub part_number: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub notes: Option<String>,
    pub image_url: Option<String>,
    #[serde(rename = "engineIds")]
    pub engine_ids: Option<Vec<serde_json::Value>>,
    pub reference_numbers: Option<String>,
}

// --- Variants ---
#[derive(Deserialize)]
pub struct VariantCreate {
    #[serde(rename = "productId")]
    pub product_id: serde_json::Value,
    #[serde(rename = "supplierId")]
    pub supplier_id: serde_json::Value,
    pub price: Option<f64>,
    pub sku: Option<String>,
    pub stock_quantity: Option<i64>,
    pub bin_location: Option<String>,
}

#[derive(Deserialize)]
pub struct VariantUpdate {
    pub price: Option<f64>,
    pub sku: Option<String>,
    pub stock_quantity: Option<i64>,
    pub bin_location: Option<String>,
}

// --- Sales ---
#[derive(Deserialize)]
pub struct SaleCreate {
    pub items: Vec<SaleItem>,
    #[serde(rename = "customerId")]
    pub customer_id: Option<serde_json::Value>,
    #[serde(rename = "paymentMethod")]
    pub payment_method: Option<String>,
    #[serde(rename = "amountPaid")]
    pub amount_paid: Option<f64>,
    pub change: Option<f64>,
    #[serde(rename = "transactionId")]
    pub transaction_id: Option<String>,
    #[serde(rename = "fromCart")]
    pub from_cart: Option<bool>,
}

#[derive(Deserialize)]
pub struct SaleItem {
    #[serde(rename = "variantId")]
    pub variant_id: serde_json::Value,
    pub product_name: Option<String>,
    #[serde(rename = "productName")]
    pub product_name_alt: Option<String>,
    pub supplier_name: Option<String>,
    #[serde(rename = "supplierName")]
    pub supplier_name_alt: Option<String>,
    pub quantity: i64,
    #[serde(rename = "unitPrice")]
    pub unit_price: f64,
}

// --- Cart ---
#[derive(Deserialize)]
pub struct CartQuery {
    #[serde(rename = "userId")]
    pub user_id: Option<String>,
}

#[derive(Deserialize)]
pub struct CartAdd {
    #[serde(rename = "userId")]
    pub user_id: serde_json::Value,
    #[serde(rename = "variantId")]
    pub variant_id: serde_json::Value,
    pub quantity: Option<i64>,
}

#[derive(Deserialize)]
pub struct CartRemove {
    #[serde(rename = "userId")]
    pub user_id: serde_json::Value,
    #[serde(rename = "variantId")]
    pub variant_id: serde_json::Value,
    pub quantity: Option<i64>,
}

#[derive(Deserialize)]
pub struct CartClear {
    #[serde(rename = "userId")]
    pub user_id: serde_json::Value,
}

// --- Stripe ---
#[derive(Deserialize)]
pub struct PaymentRequest {
    pub amount: serde_json::Value,
    #[serde(rename = "ticketNumber")]
    pub ticket_number: Option<String>,
}

// --- Settings ---
#[derive(Deserialize)]
pub struct SettingsCreate {
    pub name: String,
    pub manufacturer_id: Option<serde_json::Value>,
}

// --- Generic ---
#[derive(Serialize)]
pub struct SuccessResponse {
    pub success: bool,
}
