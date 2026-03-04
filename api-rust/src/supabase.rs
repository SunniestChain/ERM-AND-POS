use reqwest::Client;
use serde_json::Value;
use crate::error::AppError;

#[derive(Clone)]
pub struct SupabaseClient {
    client: Client,
    base_url: String,
    api_key: String,
}

impl SupabaseClient {
    pub fn new() -> Self {
        let base_url = std::env::var("VITE_SUPABASE_URL")
            .expect("VITE_SUPABASE_URL must be set");
        let api_key = std::env::var("SUPABASE_SERVICE_ROLE_KEY")
            .expect("SUPABASE_SERVICE_ROLE_KEY must be set");

        SupabaseClient {
            client: Client::new(),
            base_url,
            api_key,
        }
    }

    fn rest_url(&self, table: &str) -> String {
        format!("{}/rest/v1/{}", self.base_url, table)
    }

    fn rpc_url(&self, function_name: &str) -> String {
        format!("{}/rest/v1/rpc/{}", self.base_url, function_name)
    }

    fn default_headers(&self) -> Vec<(&str, String)> {
        vec![
            ("apikey", self.api_key.clone()),
            ("Authorization", format!("Bearer {}", self.api_key)),
        ]
    }

    /// SELECT query: GET /rest/v1/{table}?select={select}&{filters}
    pub async fn query(
        &self,
        table: &str,
        select: &str,
        query_params: &[(&str, &str)],
    ) -> Result<Value, AppError> {
        let url = self.rest_url(table);
        let mut req = self.client.get(&url).query(&[("select", select)]);

        for (key, val) in query_params {
            req = req.query(&[(key, val)]);
        }

        for (k, v) in self.default_headers() {
            req = req.header(k, v);
        }

        let resp = req.send().await?;
        let status = resp.status();
        let body: Value = resp.json().await?;

        if !status.is_success() {
            let msg = body["message"].as_str().unwrap_or("Supabase query failed");
            return Err(AppError::internal(msg));
        }

        Ok(body)
    }

    /// SELECT single row: adds header Prefer: return=representation and Accept: application/vnd.pgrst.object+json
    pub async fn query_single(
        &self,
        table: &str,
        select: &str,
        query_params: &[(&str, &str)],
    ) -> Result<Option<Value>, AppError> {
        let url = self.rest_url(table);
        let mut req = self.client.get(&url).query(&[("select", select)]);

        for (key, val) in query_params {
            req = req.query(&[(key, val)]);
        }

        for (k, v) in self.default_headers() {
            req = req.header(k, v);
        }
        req = req.header("Accept", "application/vnd.pgrst.object+json");

        let resp = req.send().await?;
        let status = resp.status();

        if status.as_u16() == 406 {
            // No rows found
            return Ok(None);
        }

        let body: Value = resp.json().await?;

        if !status.is_success() {
            let msg = body["message"].as_str().unwrap_or("Supabase query failed");
            return Err(AppError::internal(msg));
        }

        Ok(Some(body))
    }

    /// INSERT: POST /rest/v1/{table}
    pub async fn insert(
        &self,
        table: &str,
        payload: &Value,
    ) -> Result<Value, AppError> {
        let url = self.rest_url(table);
        let mut req = self.client.post(&url).json(payload);

        for (k, v) in self.default_headers() {
            req = req.header(k, v);
        }
        req = req.header("Prefer", "return=representation");

        let resp = req.send().await?;
        let status = resp.status();
        let body: Value = resp.json().await?;

        if !status.is_success() {
            let msg = body["message"].as_str().unwrap_or("Supabase insert failed");
            let code = body["code"].as_str().unwrap_or("");
            return Err(AppError {
                message: format!("{} (code: {})", msg, code),
                status: if code == "23503" { 400 } else { 500 },
            });
        }

        Ok(body)
    }

    /// INSERT and return single: adds Accept: application/vnd.pgrst.object+json
    pub async fn insert_single(
        &self,
        table: &str,
        payload: &Value,
    ) -> Result<Value, AppError> {
        let url = self.rest_url(table);
        let mut req = self.client.post(&url).json(payload);

        for (k, v) in self.default_headers() {
            req = req.header(k, v);
        }
        req = req
            .header("Prefer", "return=representation")
            .header("Accept", "application/vnd.pgrst.object+json");

        let resp = req.send().await?;
        let status = resp.status();
        let body: Value = resp.json().await?;

        if !status.is_success() {
            let msg = body["message"].as_str().unwrap_or("Supabase insert failed");
            let code = body["code"].as_str().unwrap_or("");
            return Err(AppError {
                message: format!("{} (code: {})", msg, code),
                status: if code == "23503" { 400 } else { 500 },
            });
        }

        Ok(body)
    }

    /// UPDATE: PATCH /rest/v1/{table}?{filters}
    pub async fn update(
        &self,
        table: &str,
        payload: &Value,
        query_params: &[(&str, &str)],
    ) -> Result<Value, AppError> {
        let url = self.rest_url(table);
        let mut req = self.client.patch(&url).json(payload);

        for (key, val) in query_params {
            req = req.query(&[(key, val)]);
        }

        for (k, v) in self.default_headers() {
            req = req.header(k, v);
        }
        req = req.header("Prefer", "return=representation");

        let resp = req.send().await?;
        let status = resp.status();
        let text = resp.text().await?;

        if !status.is_success() {
            return Err(AppError::internal(format!("Update failed: {}", text)));
        }

        // PATCH may return empty if no Prefer header match
        if text.is_empty() {
            Ok(Value::Null)
        } else {
            Ok(serde_json::from_str(&text)?)
        }
    }

    /// DELETE: DELETE /rest/v1/{table}?{filters}
    pub async fn delete(
        &self,
        table: &str,
        query_params: &[(&str, &str)],
    ) -> Result<(), AppError> {
        let url = self.rest_url(table);
        let mut req = self.client.delete(&url);

        for (key, val) in query_params {
            req = req.query(&[(key, val)]);
        }

        for (k, v) in self.default_headers() {
            req = req.header(k, v);
        }

        let resp = req.send().await?;
        let status = resp.status();

        if !status.is_success() {
            let body = resp.text().await?;
            // Check for FK violation
            if body.contains("23503") {
                return Err(AppError::bad_request(
                    "Cannot delete: This item is used by other records.",
                ));
            }
            return Err(AppError::internal(format!("Delete failed: {}", body)));
        }

        Ok(())
    }

    /// RPC: POST /rest/v1/rpc/{function_name}
    pub async fn rpc(
        &self,
        function_name: &str,
        params: &Value,
    ) -> Result<Value, AppError> {
        let url = self.rpc_url(function_name);
        let mut req = self.client.post(&url).json(params);

        for (k, v) in self.default_headers() {
            req = req.header(k, v);
        }

        let resp = req.send().await?;
        let status = resp.status();
        let text = resp.text().await?;

        if !status.is_success() {
            return Err(AppError {
                message: text,
                status: status.as_u16(),
            });
        }

        if text.is_empty() || text == "null" {
            Ok(Value::Null)
        } else {
            Ok(serde_json::from_str(&text)?)
        }
    }

    /// HEAD request to get count
    pub async fn count(
        &self,
        table: &str,
        query_params: &[(&str, &str)],
    ) -> Result<i64, AppError> {
        let url = self.rest_url(table);
        let mut req = self.client
            .get(&url)
            .query(&[("select", "*")])
            .header("Prefer", "count=exact");

        for (key, val) in query_params {
            req = req.query(&[(key, val)]);
        }

        for (k, v) in self.default_headers() {
            req = req.header(k, v);
        }
        req = req.header("Range-Unit", "items");
        req = req.header("Range", "0-0");

        let resp = req.send().await?;
        // Parse content-range header: "0-0/42" -> 42
        if let Some(range) = resp.headers().get("content-range") {
            let range_str = range.to_str().unwrap_or("*/0");
            if let Some(total) = range_str.split('/').nth(1) {
                if total == "*" {
                    return Ok(0);
                }
                return Ok(total.parse().unwrap_or(0));
            }
        }
        Ok(0)
    }
}
