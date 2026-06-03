async function testOrder() {
    try {
        const payload = {
            paymentMethod: "Tiền mặt",
            items: [
                {
                    productId: 8, // Trà Đào
                    sugarLevel: "100%",
                    iceLevel: "100%",
                    quantity: 3,
                    toppings: [
                        { toppingId: 4, price: 10000 },
                        { toppingId: 5, price: 1000 }
                    ]
                }
            ],
            status: "COMPLETED",
            customerId: null,
            pointsUsed: 0
        };

        const res = await fetch('http://127.0.0.1:3000/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': '2', // Admin user abc
                'staff-id': '4' // Staff user1
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log("RESPONSE:", res.status, data);
    } catch (e) {
        console.error("ERROR:", e);
    }
}

testOrder();
