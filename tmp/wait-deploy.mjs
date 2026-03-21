const url = "https://e3catalog.vercel.app/api/auth/login";

async function poll() {
  console.log("Polling production login endpoint...");
  let attempt = 1;
  while (attempt <= 15) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "wrongpassword" })
      });
      const data = await res.text();
      console.log(`[Attempt ${attempt}] Status: ${res.status}`);
      if (res.status === 401 && data.includes("Invalid credentials")) {
        console.log("SUCCESS! The database schema lookup is now correct.");
        process.exit(0);
      } else if (res.status === 500) {
        console.log("Still failing with 500 error...");
      } else {
        console.log("Unexpected status:", res.status, data);
      }
    } catch (err) {
      console.error("Fetch failed:", err.message);
    }
    attempt++;
    await new Promise(r => setTimeout(r, 10000));
  }
  console.log("Timeout waiting for deployment.");
  process.exit(1);
}

poll();
