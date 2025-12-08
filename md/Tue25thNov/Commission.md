# VTPass Products & Commissions

## Airtime & Data

| SN  | PRODUCT                       | COMMISSION |
| --- | ----------------------------- | ---------- |
| 1   | MTN - Airtime VTU & DATA      | 3.00%      |
| 2   | GLO - Airtime VTU, DATA & SME | 4.00%      |
| 3   | 9mobile - Airtime VTU & DATA  | 4.00%      |
| 4   | Airtel - Airtime VTU & DATA   | 3.40%      |
| 5   | International Airtime         | 3.00%      |

## Electricity Payment

| SN  | PRODUCT                                         | COMMISSION |
| --- | ----------------------------------------------- | ---------- |
| 1   | Aba Electricity Payment - ABEDC                 | 1.70%      |
| 2   | Abuja Electricity Distribution Company - AEDC   | 1.20%      |
| 3   | Benin Electricity - BEDC                        | 1.50%      |
| 4   | Eko Electric Payment - EKEDC                    | 1.00%      |
| 5   | Enugu Electric - EEDC                           | 1.40%      |
| 6   | IBEDC - Ibadan Electricity Distribution Company | 1.10%      |
| 7   | Ikeja Electric Payment - IKEDC (NMD)            | 1.00%      |
| 8   | Ikeja Electric Payment - IKEDC (MD)             | 0.20%      |
| 9   | Jos Electric - JED                              | 0.90%      |
| 10  | Kaduna Electric - KAEDCO                        | 1.50%      |
| 11  | Kano Electric - KEDCO                           | 1.00%      |
| 12  | PHED - Port Harcourt Electric (NMD)             | 2.00%      |
| 13  | PHED - Port Harcourt Electric (MD)              | 0.40%      |
| 14  | Yola Electric - YEDC                            | 1.20%      |

## TV Subscriptions

| SN  | PRODUCT                | COMMISSION |
| --- | ---------------------- | ---------- |
| 1   | DSTV Subscription      | 1.50%      |
| 2   | Gotv Payment           | 1.50%      |
| 3   | Startimes Subscription | 2.00%      |

## Education

| SN  | PRODUCT                                  | COMMISSION |
| --- | ---------------------------------------- | ---------- |
| 1   | JAMB PIN VENDING (UTME & Direct Entry)   | ₦150.00    |
| 2   | WAEC (Result Checker PIN & Registration) | ₦250.00    |

I want to implement cashback in our app, but before that i noticed that if a user had 200 naira in their wallet and they but airtime of 100 naira, it seems we deduct 102 naira because their wallet balance after that 100 naira airtime purchase is 98 naira.

Our backend api is inside /Users/joseph/Desktop/raverpay/apps/raverpay-api and using pnpm same with our admin dashboard inside of /Users/joseph/Desktop/raverpay/apps/raverpay-admin using pnpm. Our mobile app is using npm and inside of /Users/joseph/Desktop/raverpay/app

So for our cashback, help me plan how it should work on our mobile app but from my experience using opay, moniepoint and all. On each data plan showing, we show a small card saying "#20 cashback" (based on the percentage calculation) and when each data is clicked on our confirmation dialog we current show on breakdown and also a text saying "Bonus to earn" and the amount they earn in front of it then under this another tet saying "cashback" and an amount with a toggle in the front. Probably this could be cashback they already have as a user. so lets say they already a cashback on the app which is 10 naira, once they toggle the switch infront of the cashback text it removes that from the total amount a user will pay for that data. Help me plan this very well.

Also these value/cashback percentage showing on the app will be based on what we set on the admin side of things so we don't hardcode the values.

Create a new branch before you start implementing it. Don't write code yet, just create an MD of how it will work accross all our backend, mobile and admin page. Do not write code yet.
