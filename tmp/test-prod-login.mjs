async function testProdLogin() {
  try {
    const res = await fetch("https://e3catalog.vercel.app/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "wrongpassword" })
    });
    
    const data = await res.text();
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    console.log("Response:", data);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testProdLogin();
