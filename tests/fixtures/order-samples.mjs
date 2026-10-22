// SYNTHETIC order samples written by hand for testing parseOrderText. None of these are real emails or pages;
// they imitate the layout of copied text (one field per line, labels, prices, addresses). Names/addresses/cards are fake.
// expect: food names the parser should produce (checked), maybe: kept but unchecked, absent: must not appear.
export const SAMPLES = [
{ id: 'amazon-email', label: 'Amazon order confirmation email (SYNTHETIC)', text: `
Amazon.com
Hello Jordan,
Thank you for shopping with us. We'll send a confirmation when your items ship.
Ordered on October 18, 2026
Order #112-3456789-1234567
Arriving Thursday, October 23
Ship to: Jordan Smith, 1234 Elm St, Denver, CO 80202
Order Total: $47.82
View or edit order

Barilla Spaghetti Pasta, 16 oz (Pack of 4)
Quantity: 1
$7.96
Sold by: Amazon.com Services LLC

Happy Belly Extra Virgin Olive Oil, 33.8 Fl Oz
Quantity: 1
$12.49
Sold by: Amazon.com Services LLC

Great Value Large White Eggs, 12 Count
Quantity: 2
$6.84

Amazon Basics Paper Towels, 6 Double Rolls
Quantity: 1
$15.99

Energizer AA Batteries, 8 Pack
Quantity: 1
$9.49

Item Subtotal: $52.77
Shipping & Handling: $0.00
Promotion Applied: -$5.00
Estimated Tax: $0.05
Order Total: $47.82
Paid with Visa ending in 4242
Gift Card balance: $0.00
©2026 Amazon.com, Inc. or its affiliates.
`, expect: ['spaghetti', 'olive oil', 'eggs'], qty: { spaghetti: [4, ''], 'olive oil': [33.8, 'oz'], eggs: [24, ''] }, absent: ['paper towel', 'batter', 'jordan', 'elm', 'visa', 'total', 'gift'] },

{ id: 'amazon-page', label: 'Amazon "Your Orders" order-details page (SYNTHETIC)', text: `
Your Orders
Order Details
Ordered on October 15, 2026   Order# 113-9876543-7654321
Invoice
Ship to
Jordan Smith
5678 Pine Ave Apt 4B
DENVER, CO 80205
United States
Payment method
Mastercard ending in 1111
Order Summary
Item(s) Subtotal: $38.21
Shipping & Handling: $0.00
Total before tax: $38.21
Estimated tax to be collected: $1.10
Grand Total: $39.31
Delivered October 17
Your package was left near the front door or porch.
Track package
2
Kirkland Signature Organic Chicken Stock, 32 oz, 6-count
Sold by: Amazon.com Services LLC
Return or replace items: Eligible through November 16, 2026
$14.99
Condition: New
Buy it again
View your item
Tillamook Medium Cheddar Cheese Block, 2 lb
Sold by: Amazon.com Services LLC
$11.49
Buy it again
Bush's Best Black Beans, 15 oz (Pack of 12)
$11.73
Buy it again
iPhone 15 Phone Case, Clear
$9.99
Write a product review
Customers who bought this also bought
`, expect: ['chicken stock', 'cheddar cheese', 'black beans'], qty: { 'chicken stock': [12, ''], 'cheddar cheese': [2, 'lb'], 'black beans': [12, ''] }, absent: ['jordan', 'pine', 'denver', 'mastercard', 'phone', 'package', 'total'] },

{ id: 'instacart', label: 'Instacart receipt email (SYNTHETIC)', text: `
Your order from Safeway
Hi Jordan,
Your order is complete! Here's your receipt.
Delivered on Tuesday, Oct 21 at 5:42 PM
Order #1234567890
Your shopper: Maria
Found items
Organic Bananas
$0.69/lb
2.13 lb
$1.47
Horizon Organic Whole Milk, 0.5 gal
1 × $5.49
$5.49
Large Hass Avocado
3 × $1.25
$3.75
Lucerne Shredded Mozzarella Cheese, 8 oz
2 × $3.99
$7.98
Fresh Express Romaine Hearts, 3 ct
1 × $4.29
$4.29
Brawny Paper Towels, 6 Rolls
1 × $12.99
$12.99
Refunded items
Ground Beef 80/20, 1 lb
1 × $6.99
-$6.99
Subtotal
$35.97
Service fee
$3.24
Delivery fee
$3.99
Bag fee
$0.40
Shopper tip
$5.00
Total charged
$48.60
Card ending in 4242
Rate your shopper
Questions? Visit help.instacart.com
`, expect: ['bananas', 'milk', 'avocados', 'mozzarella cheese', 'romaine hearts'], qty: { bananas: [2.13, 'lb'], milk: [0.5, 'gal'], avocados: [3, ''], 'mozzarella cheese': [16, 'oz'] }, absent: ['ground beef', 'paper towel', 'maria', 'safeway', 'tip', 'fee', 'jordan'] },

{ id: 'walmart', label: 'Walmart order email (SYNTHETIC)', text: `
Walmart
Thanks for your order, Jordan!
Order number: 2000123-45678901
Order date: Oct 20, 2026
Arrives by Thu, Oct 23
Delivery address
Jordan Smith
910 Oak Blvd
Aurora, CO 80012
Items ordered
Great Value Whole Vitamin D Milk, 1 Gallon
Qty 1
$3.48
Fresh Banana, Each
Qty 6
$1.50
Marketside Fresh Spinach, 10 oz Bag
Qty 1
$2.98
Sun-Maid California Sun-Dried Raisins, 12 oz
Qty 1
$3.24
Tyson Boneless Skinless Chicken Breasts, 2.5 lb
Qty
2
$21.94
Hellmann's Real Mayonnaise, 30 oz
Qty 1
$5.97
Equate Ibuprofen Tablets, 200 mg, 100 Count
Qty 1
$4.88
Subtotal $43.99
Delivery fee Free
Driver tip $4.00
Tax $1.12
Total $49.11
Paid with Visa ending in 4242
Walmart+ savings $9.95
Manage your order at walmart.com
`, expect: ['milk', 'bananas', 'spinach', 'raisins', 'chicken breast', 'mayonnaise'], qty: { milk: [1, 'gal'], bananas: [6, ''], spinach: [10, 'oz'], 'chicken breast': [5, 'lb'], mayonnaise: [30, 'oz'] }, absent: ['ibuprofen', 'oak', 'aurora', 'jordan', 'visa', 'tip', 'walmart'] },

{ id: 'generic', label: 'Generic "Qty 2 · item" list (SYNTHETIC)', text: `
Qty 2 · Chicken breast
Qty 1 · Cheddar cheese
3 x Avocados
Milk x2
Bread 2 ct
2 lb ground beef
Sugar Snap Peas
1 Dr Pepper Soda, 12 pack
Kirkland Signature Purified Water, 16.9 Fl Oz, Case of 40
Qty 1 · Mystery Gadget Pro
Qty 1 · Phone charger
`, expect: ['chicken breast', 'cheddar cheese', 'avocados', 'milk', 'bread', 'ground beef', 'sugar snap peas', 'dr pepper soda', 'purified water'], maybe: ['mystery gadget pro'], qty: { 'chicken breast': [2, ''], avocados: [3, ''], milk: [2, ''], bread: [2, ''], 'ground beef': [2, 'lb'] }, absent: ['phone charger'] },

{ id: 'junk-only', label: 'Shipping notice with no items (SYNTHETIC)', text: `
Hello Jordan,
Your package has shipped!
Order #112-1111111-2222222
Arriving tomorrow by 9 PM
Ship to: Jordan Smith, 1234 Elm St, Denver, CO 80202
Track package
Visa ending in 4242
Order Total: $47.82
`, expect: [], absent: ['jordan', 'elm', 'visa'] },

{ id: 'unknown-format', label: 'Unknown store format, prose only (SYNTHETIC, for the AI path)', text: `
Hi Jordan Smith,
We picked up three ripe mangoes and a dozen brown eggs for you today.
Ship to
Jordan Smith
1234 Elm St
Denver, CO 80202
Paid with Visa ending in 4242
Call us at (303) 555-0100
`, expect: [], absent: [] }
];
