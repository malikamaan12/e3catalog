// Use built-in fetch

async function testApply() {
    const body = {
        companyName: "Test Vendor",
        website: "http://test.com",
        taxId: "123456",
        pocName: "John Doe",
        pocPhone: "1234567890",
        email: "test_new_vendor_" + Date.now() + "@example.com",
        password: "password123",
        taxCardUrl: "",
        companyRegistrationUrl: "",
        bankName: "Test Bank",
        accountName: "John Doe",
        accountNumber: "123456789",
        iban: "QA123456789",
        swift: "TESTQA",
        agreedToTerms: true
    };

    try {
        const res = await fetch('http://localhost:3000/api/vendors/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const status = res.status;
        const text = await res.text();
        console.log('Status:', status);
        console.log('Response:', text);
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

testApply();
