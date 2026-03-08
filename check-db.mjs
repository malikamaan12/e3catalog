import { db } from "./src/lib/db/index.mjs";
import { bookings, cartItems } from "./src/lib/db/schema.mjs";

async function run() {
    console.log("Cart Items:");
    const cart = await db.query.cartItems.findMany({ limit: 5 });
    console.log(cart.map(c => ({ id: c.id, productId: c.productId, quantity: c.quantity })));

    console.log("\nBookings:");
    const b = await db.query.bookings.findMany({ limit: 5 });
    console.log(b.map(x => ({ id: x.id, productId: x.productId, units: x.units })));
}
run();
