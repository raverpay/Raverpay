Dedicated Virtual Accounts
Learn how to create virtual accounts for your customers to pay you with.

Feature Availability
This feature is only available to registered businesses in Nigeria and Ghana that have successfully completed the go-live process.

Introduction
Dedicated Virtual Accounts (DVAs) is a feature on the Paystack Dashboard and API that lets you create bank accounts for your customers. These accounts allow your customers to carry out different transactions on your business.

When you create a Dedicated Virtual Account (DVA) for a customer, all bank transfers to that account will automatically be recorded as transactions from that customer.

The creation and assignment of a DVA to a customer involves three steps:

Create a customer
Validate a customer (required for certain business categories)
Create a DVA for the customer
Based on the steps above, there are two possible integration flows:

Multi-step account assignment: In this flow, you’ll make a request for each step and handle the response before proceeding to the next step.
Single-step account assignment: In this flow, you pass the necessary data to an endpoint that will handle the creation and assignment of a DVA to the customer.
There are asynchronous processes involved in both flows so you need to set up webhooks to get updates on your requests.

Set up webhooks
For a start, you need to listen to the charge.success event. Bank transfers happen from external sources and we only get notified after the transfer is complete. The only way to know when a payment has been done is through webhooks.

The charge.success webhook event lets you know when you've received a bank transfer payment. Here's a sample authorization object in the charge.success event for a dedicated virtual account payment:

JSON
{
"authorization": {
"authorization_code": "AUTH_0ozsafcpdf",
"bin": "413XXX",
"last4": "X011",
"exp_month": "01",
"exp_year": "2020",
"channel": "dedicated_nuban",
"card_type": "transfer",
"bank": "First City Monument Bank",
"country_code": "NG",
"brand": "Managed Account",
"reusable": false,
"signature": null,
"sender_bank": "First City Monument Bank",
"sender_bank_account_number": "XXXXXX0011",
"sender_country": "NG",
"sender_name": "RANDALL AKANBI HORTON",
"narration": "NIP: RHODA CHURCH -1123344343/44343231232",
"receiver_bank_account_number": "9930000902",
"receiver_bank": "Wema Bank"
}
}
Multi-step account assignment
This is suited for merchants who want to control each step of the account creation and assignment to a customer. In this flow, you’ll manage the creation of a customer, the validation of the customer, and the creation of a DVA.

Create a customer
A dedicated virtual account is tied to a customer so you need to create a customer by passing the email, first_name, last_name and phone to the Create customerAPI.

If the customer already exists on your platform, kindly ensure the customer's first_name, last_name and phone are set. This is because we need the customer's details to create a bank account. For customers created without these details, you can update the customer record by passing first_name, last_name and phone when creating the virtual account with Create Dedicated Virtual AccountAPI

Validate a customer
Process requirement
This is only required for Nigerian businesses.

For compliance reasons, businesses that offer their services under the business categories - Betting, Financial services, and General services can only generate bank account numbers for customers whose personal identity information has been validated. This information is then used in naming the bank account number. Here's how to validate a customer's identity.

Get Customer's Consent
Generating a dedicated virtual account requires personal customer information, and should only be used with a customer's express consent, not by default.

Create a dedicated virtual account
To create a dedicated virtual account for a customer, send a POST request to our Create Dedicated Virtual AccountAPI.

Supported banks
You can get supported banks by calling the Fetch ProvidersAPI endpoint.

cURL
Show Response

curl https://api.paystack.co/dedicated_account
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{ "customer": "CUS_358xertt55", "preferred_bank": "titan-paystack"}'
-X POST
When the customer attempts to make a transfer to the created account number, the account name will follow the format, Product Name / Customer Name .

For businesses, that provide virtual accounts as a service, we have a naming feature that lets you personalize the account name based on the company you're providing the service to. You cab send an email to support@paystack.com so we can review and extend the feature to your business.

Account Limit
By default, you can generate up to 1,000 dedicated bank accounts for your customers. This limit can be increased upon review of your business and use-case. To increase the limit for your business, send an email to support@paystack.com

Testing Dedicated Virtual Accounts (Nigeria only)
To create Dedicated Virtual Accounts using your test secret key, use test-bank as the preferred_bank in the request body parameters.

You can also make a transfer to the test virtual accounts using our demo bank app.

Single-step account assignment
In this flow, you pass the customer details to us and we handle the creation and assignment of the DVA to the customer. Your request parameters are dependent on your business category. For compliance reasons, certain businesses are required to validate their customers.

Required compliance
Process requirement
This is only required for Nigerian businesses.

Businesses that offer their services under the business categories - Betting, Financial Services, and General services need to validate the personal identifying information of their customers before a bank account can be generated.

Merchants in this category need to add the customer’s bank details for validation:

cURL
Show Response

curl https://api.paystack.co/dedicated_account/assign
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{
"email": "janedoe@test.com",
"first_name": "Jane",
"middle_name": "Karen",
"last_name": "Doe",
"phone": "+2348100000000",
"preferred_bank": "test-bank",
"country": "NG",
"account_number": "0123456789",
"bvn": "20012345678",
"bank_code": "007"
}'
-X POST
Supported banks
You can get supported banks by calling the Fetch ProvidersAPI endpoint.

You’ll receive two webhook events due to the customer validation step. If the customer validation step fails, we’ll send you the customeridentification.failed and assigndedicatedaccount.failed events. If all goes well, we’ll send you the customeridentification.success and the assigndedicatedaccount.success events. Kindly check the handling events section to learn about the structure of these events.

Optional compliance
For merchants in this category, you only need to pass the customer data and the preferred bank:

cURL
Show Response

curl https://api.paystack.co/dedicated_account/assign
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{
"email": "janedoe@test.com",
"first_name": "Jane",
"middle_name": "Karen",
"last_name": "Doe",
"phone": "+2348100000000",
"preferred_bank": "test-bank",
"country": "NG"
}'
-X POST
The dedicatedaccount.assign.success event is sent on the successful creation and assignment of the DVA, while the dedicatedaccount.assign.failed event is sent when the account couldn't be created. You should check out the handling events section to learn about the structure of these events.

Handling events
We send the following events for different stages of the creation and assignment of a DVA:

Event Description
customeridentification.success This is sent when a customer’s identity has been validated
customeridentification.failed This is sent when a customer’s identity couldn't be validated
dedicatedaccount.assign.success This is sent when a DVA has been successfully created and assigned to a customer
dedicatedaccount.assign.failed This is sent when a DVA couldn't be created and assigned to a customer
Customer Identification FailedCustomer Identification SuccessfulDVA Assignment FailedDVA Assignment Successful
{
"event": "customeridentification.failed",
"data": {
"customer_id": 82796315,
"customer_code": "CUS_XXXXXXXXXXXXXXX",
"email": "email@email.com",
"identification": {
"country": "NG",
"type": "bank_account",
"bvn": "123**\***456",
"account_number": "012\*\*\*\*345",
"bank_code": "999991"
},
"reason": "Account number or BVN is incorrect"
}
}
Get a customer's dedicated virtual account
If you want to retrieve a customer's dedicated virtual account, call the Fetch CustomerAPI endpoint. You can retrieve the dedicated virtual account from the dedicated_account object in the response:

JSON
{
"status": true,
"message": "Customer retrieved",
"data": {
"transactions": [],
"subscriptions": [],
"authorizations": [],
"first_name": "Rhoda",
"last_name": "Church",
"email": "rhodachurch@email.com",
"phone": "08154211006",
"domain": "live",
"customer_code": "CUS_dy1r7ts03zstbq5",
"dedicated_account": {
"bank": {
"name": "Wema Bank",
"id": 20,
"slug": "wema-bank"
},
"id": 173,
"account_name": "KAROKART/RHODA CHURCH",
"account_number": "9930020212",
"created_at": "2019-12-09T13:31:38.000Z",
"updated_at": "2019-12-09T16:04:25.000Z",
"currency": "NGN",
"active": true,
"assigned": true,
"assignment": {
"assignee_id": 1530104,
"assignee_type": "Integration",
"account_type": "PAY-WITH-TRANSFER-RECURRING",
"integration": 100043
}
}
}
}
Requery a customer's dedicated virtual account
When a customer makes a transfer to a dedicated virtual account, a transaction is automatically created for the customer, and a webhook is sent to your server to notify you of the transaction. This typically happens within a few minutes.

However, in some cases, the notification could take longer to come in. When this happens, the customer might reach out to you that their account/wallet hasn't been credited, or they would try to refresh their balance in your application.

In this scenario, you can use the Requery Dedicated Virtual AccountAPI endpoint to check the virtual account for new transactions that haven't been processed yet. Calling this endpoint will trigger a background requery process, and if any pending transactions are found, the transaction will be created, and the webhook notification will be sent to your server.

cURL
Show Response

curl https://api.paystack.co/dedicated_account/requery?account_number={accountNumber}&provider_slug={provider_slug}&date={yyyy-mm-dd}
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-X GET
Rate Limit
You're only allowed to requery a dedicated virtual account once every ten minutes. If you try to requery a dedicated virtual account more than once in a 10 minute window, the request won't be processed.

Split payment on dedicated virtual account
Split payment for dedicated virtual allows you to automatically split funds received into a dedicated virtual account between your main settlement bank account and one or more bank account(s).

Prerequisite
You need a basic knowledge of Split Payments or Multi-split Payments before proceeding with this section.

There are two ways to add split payment on dedicated virtual account:

Add a subaccount when creating a dedicated virtual account
Add a subaccount to an existing dedicated virtual account
For multi-split payment on dedicated virtual account:

Add a split code when creating a dedicated virtual account
Add a split code to an existing dedicated virtual account
Add a subaccount when creating a dedicated virtual account
You can add a subaccount code to the payload when you create a dedicated virtual account for the customer

cURL
Show Response

curl https://api.paystack.co/dedicated_account
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{ "customer": 481193,
"preferred_bank":"wema-bank",
"subaccount": "SUB_ACCOUNTCODE"
}'
-X POST
Add a subaccount to an existing dedicated virtual account
When updating an already existing dedicated virtual account, you can pass a subaccount code as one of the parameters.

cURL
Show Response

curl https://api.paystack.co/dedicated_account/split
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{ "account_number": "0033322211", "subaccount": "SUB_ACCOUNTCODE" }'
-X POST
Updating existing subaccount on a dedicated virtual account
You can also use this endpoint to edit an existing subaccount on any dedicated virtual account. If a dedicated virtual account has a subaccount, using this endpoint updates the subaccount to the new subaccount.

Add a split code when creating a dedicated virtual account
You can add a split code to the payload when you create a dedicated virtual account for the customer

cURL
Show Response

curl https://api.paystack.co/dedicated_account
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{ "customer": 481193,
"preferred_bank":"wema-bank",
"split_code": "SPL_e7jnRLtzla"
}'
-X POST
Add a split code to an existing dedicated virtual account
When updating an already existing dedicated virtual account, you can pass a split code as one of the parameters.

cURL
Show Response

curl https://api.paystack.co/dedicated_account/split
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{ "account_number": "0033322211", "split_code": "SPL_e7jnRLtzla" }'
-X POST
Updating existing split code on a dedicated virtual account
You can also use this endpoint to edit an existing split code on any dedicated virtual account. If a dedicated virtual account has a split code, using this endpoint updates the split code to the new split code.

Remove Split
This allows you to remove a subaccount code assigned to any dedicated virtual account, so that subsequent transactions received are fully settled into the main settlement account

cURL
Show Response

curl https://api.paystack.co/dedicated_account/split
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{ "account_number": "0033322211" }'
-X DELETE
Inbound Transfer Approval
Feature Availability
Only Paystack-Titan Virtual Accounts support this feature.

Inbound transfer approval allows businesses to accept or reject individual transactions to Paystack-Titan Virtual Accounts. This feature works for Dedicated Virtual Accounts and Pay with Transfer. It enables businesses to control the virtual account transactions they wish to receive, thereby reducing the overheads associated with managing unwanted transactions and processing refunds.

To enable this feature, go to the Settings page, and look for Virtual accounts in the Preferences tab on your dashboard. Select the Inbound Transfer Approval option and provide a webhook url that will process the webhook events.

Image of transfer approval from the dashboard
Paystack will send a webhook event with details of the payer account and the receiver account when a customer attempts a transfer to an account. You can use these details to make your decision.

{
"payer_account_number": "44940573849",
"payer_account_name": "CIOKARAINE LAMAR",
"payer_bank_code": "00711",
"payer_bank_name": "Guaranty Trust Bank",
"receiver_account_number": "00000000001",
"receiver_account_name": "AUBREY GRAHAM",
"recipient_account_type": "bank_transfer OR dedicated_nuban",
"session_id": "10000000000000000000000000000",
"sent_at": "2024-07-31T11:28:06.872Z",
"provider": "titan-paystack",
"amount": 10000,
"narration": "Transfer from CIOKARAINE LAMAR"
}
Response times
Please avoid long-running tasks. We require a response within 5 seconds otherwise Paystack will automatically accept the inbound transfer. Also ensure you’re returning HTTP 200 OK status codes for both Accept & Reject responses.

Your server should respond in less than 5 seconds with a JSON response containing the decision, either REJECT or ACCEPT. You can include a reason parameter, that explains the decision. This will appear on your dashboard.

{
"decision": "REJECT || ACCEPT",
"reason": "Optional explanation here"
}
In cases where we're unable to reach your approval endpoint, we’ll automatically accept the transfer, and complete the transaction. We don't retry the webhook event.
