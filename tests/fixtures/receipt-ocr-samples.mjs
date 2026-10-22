// SYNTHETIC receipt text, written by hand to look like Tesseract output from a phone photo of a grocery receipt
// (stray "|" marks, 0/O mix-ups, commas for dots, tax flags, product codes). Not real receipts; store names,
// addresses, card numbers and codes are made up.
// expect: words that must appear in the names of checked (sure) items. absent: must not appear in any item.
// qty: { word: [qty, unit] } for the item whose name contains that word.
export const RECEIPTS = [
{ id: 'walmart', label: 'Walmart-style receipt (SYNTHETIC, noisy OCR)', text: `
Walmart >|<
Save money. Live better.
( 303 ) 555 - 0142
MANAGER JANE DOE
7800 E COLFAX AVE
DENVER CO 80220
ST# 01234 OP# 009876 TE# 12 TR# 04567
GV WHL MLK GAL 007874235186 F 3.48 N
BANANAS 000000004011KI 1.24 N
1.32 lb @ 1 lb /0.58
BNLS CHKN BRST 0202127O0000 F 7.99 N
GV LG EGGS 18CT 007874213048 F 4,12 N
| YGRT GRK VAN 081814030113 F 1.18 N
2 AT 1 FOR 1.18 2.36 N
PNT BTR CRMY 005150025516 F 2.98 N
GV SHRD CHDR CHS 007874201225 F 2.47 N
PAPER TOWELS 003600056672 3.97 X
SUBTOTAL 25.41
TAX 1 2.900 % 0.11
TOTAL 25.52
VISA TEND 25.52
ACCOUNT # **** **** **** 4242 S
APPROVAL # 08123K
REF # 429100123456
CHANGE DUE 0.00
# ITEMS SOLD 9
TC# 1234 5678 9012 3456 7890
10/21/26 18:42:11
`,
  expect: ['milk', 'banana', 'chicken breast', 'egg', 'yogurt', 'peanut butter', 'cheddar'],
  absent: ['towel', 'total', 'tax', 'visa', 'tend', 'change', 'approval', 'account', 'walmart', 'manager', 'colfax', 'sold'],
  qty: { milk: [1, 'gal'], banana: [1.32, 'lb'], egg: [18, ''], yogurt: [2, ''] } },

{ id: 'king-soopers', label: 'King Soopers-style receipt (SYNTHETIC, noisy OCR)', text: `
KING SOOPERS
1155 E 9TH AVE
DENVER, CO 80218
STORE 00012 (303) 555-0187
YOUR CASHIER WAS SELF
KRO WHL MLK GAL        3.49 B
0.82 lb @ 0.69 /lb
ORG BANANAS            0.57 B
   2 @ 1.25
CHOBANI GRK YGRT       2.50 B
SC KROGER SAVINGS      0.50-B
BNLS CHKN BRST         8.47 B
PRVT SEL SPGTI         1,79 B
KRO SHRD CHDR CHS      2.99 B
GRD BF 80/20           5.99 B
**** BALANCE          24.30
VISA                  24.30
CHANGE                 0.00
TOTAL NUMBER OF ITEMS SOLD = 8
10/21/26 5:42pm 012 34 567 890
KROGER PLUS CUSTOMER ****1234
TOTAL SAVINGS 0.50
FUEL POINTS THIS TRIP 20
`,
  expect: ['milk', 'banana', 'yogurt', 'chicken breast', 'spaghetti', 'cheddar', 'ground beef'],
  absent: ['saving', 'balance', 'visa', 'change', 'total', 'fuel', 'cashier', 'king', 'store', 'customer'],
  qty: { milk: [1, 'gal'], banana: [0.82, 'lb'], yogurt: [2, ''] } },

{ id: 'blurry', label: 'Unreadable photo (SYNTHETIC)', text: `
~~ .. ,' |
lI1 ;: --
TOTAL 12.40
`, expect: [], absent: ['total'] }
];
