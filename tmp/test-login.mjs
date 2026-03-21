import fetch from "node-fetch";

async function testLogin() {
  try {
    console.log("Testing POST /api/auth/login...");
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "wrongpassword" })
    });
    
    const data = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testLogin();
