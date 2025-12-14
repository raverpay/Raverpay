Overview
Introduction
Welcome to the Sudo API! 🙋🏽‍♂️
Our documentation will guide you throughout your integration, from the basics (authentication, request structure) to using and creating financial products (accounts, cards, payments, etc.).
Ready to get started? Sign up here to receive immediate access to our Sandbox and start building with Sudo.
We’re excited you’re here! We promise you’ll be up and running in a jiffy! 🤞🏽


Overview
Environments
The Sudo API and Dashboard are available in two environments:
Environment	Sandbox	Production
Dashboard URL	https://app.sandbox.sudo.cards	https://app.sudo.africa
API URL	https://api.sandbox.sudo.cards	https://api.sudo.africa
Vault URL	https://vault.sudo.africa	https://vault.sudo.cards
VGS Script	<script type="text/javascript" src="https://js.securepro.xyz/sudo-show/1.1/ACiWvWF9tYAez4M498DHs.min.js"></script>	<script type="text/javascript" src="https://js.securepro.xyz/sudo-show/1.1/ACiWvWF9tYAez4M498DHs.min.js"></script>
Vault ID	we0dsa28s	vdl2xefo5
The sandbox environment contains special API operations that allow you to easily test and simulate different activities, from account payments to card payments. You can find the full reference under Simulations.



Overview
Authentication
Sudo’s API uses OAuth 2.0 Bearer Token to authenticate requests. All API calls must include a bearer token.

curl
GET /cards HTTP/1.1
Host: api.sandbox.sudo.africa
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cC...
An invalid, missing, or expired token will result in HTTP 401 Unauthorized responses.

Overview
Errors
Sudo uses conventional HTTP response codes to indicate the success or failure of an API request. In general: Codes in the 2xx range indicate success. Codes in the 4xx range indicate an error that failed given the information provided (e.g., a required parameter was omitted, a request failed, etc.). Codes in the 5xx range indicate an error with Sudo’s servers (these are rare).
Code	Description
200 - OK	Everything worked as expected.
400 - Bad Request	The request was unacceptable, often due to missing a required parameter.
401 - Unauthorized	No valid API key was provided.
402 - Request Failed	The parameters were valid but the request failed.
403 - Forbidden	The API key doesn’t have permission to perform the request.
404 - Not Found	The requested resource doesn’t exist.
409 - Conflict	The request conflicts with another request.
429 - Too Many Requests	Too many requests hit the API too quickly. We recommend an exponential backoff of your requests.
500, 502, 503, 504 - Server Errors	Something went wrong on Sudo’s end. These are rare and if they happen, please contact us immediately.

Overview
Metadata
The Sudo API allows you to store useful additional structured information on an object. You can store multiple key-value pairs which will be available on the data object at any time when retrieved. Sudo does not make use of any data you store in the metadata object.
Do not store any sensitive information (card details, passwords, personal identification details etc.) as metadata.

Overview
Pagination
Sudo supports fetch of all top-level API resources like Customers, Cards, Authorizations, Transactions, etc. These endpoints share a common structure, taking at least these two parameters: page and limit. By default, the page is set to 0 and a limit of 25. You can fetch a maximum of 100 records at once. The resulting response will always include a pagination object with the total records count, the number of pages, the current page, and the limit set.

javascript
{
    "statusCode": 200,
    "message": "Cards fetched successfully.",
    "data": [
    {.....},
    {.....},
    {.....}
    ],
    "pagination": {
        "total": 1,
        "pages": 1,
        "page": "0",
        "limit": "25"
    }
}

Overview
Lecture
We trust you have received the usual lecture from the local System Administrator. It usually boils down to these three things:
Respect the privacy of others.
Think before you type.
With great power comes great responsibility.

Getting Started
Create API Key
Creating an API Key can be easily done on your dashboard by following these steps.
​
How to Create API Key
Log in to the Sudo Dashboard and click on Developers.
Click on API Keys in the Developers navigation menu seen horizontally on your screen. Click on the Create API Key button, located on the right-hand side of your screen.
2880
Then fill in the required details for your key, such as Name, Validity Period, and IP Address (Optional) as indicated in Steps 4, 5, and 6 respectively.
Once you’re done, click on the Create API Key button on the modal, as shown in Step 7.
Copy the API Key shown on your screen as it will be shown only once and can not be retrieved afterward.
2880
If an IP address is provided, only requests originating from that IP will be allowed. If no IP is provided, all requests will be denied.
​
IP Whitelist
The IP Whitelist system is a security layer used to restrict access to protected API Keys by allowing requests only from explicitly approved IP addresses or IP ranges.
​
Supported IP Formats
Sudo supports the following IP formats for flexibility and security:
Format Type	Description	Example
Exact IPv4	Matches a single IPv4 address	192.168.1.10
Exact IPv6	Matches a single IPv6 address	2c0f:eb58:612:3500:e839:c029:487f:12a7
IPv6-mapped IPv4	Automatically normalized	::ffff:192.168.1.10 → 192.168.1.10
CIDR Notation	Matches a subnet range	192.168.0.0/16 or 2607:f8b0::/32
Regex Pattern	Dynamic IP matching with regular expressions	`/^10.0.(1
Wildcard	Automatically allows all IPs	*, 0.0.0.0, "", [*]
Think your API Key is compromised or stolen, you can delete an API Key by clicking on the delete button beside each key as shown on the table.

Getting Started
Setup Webhooks
Creating a Webhook endpoint can be easily done on your dashboard by following these steps.
2880
Log in to the Sudo Dashboard and click on Developers.
Click on Webhooks in the Developers navigation menu seen horizontally on your screen.
Click on the Create Webhook button, then fill in the required details for your webhook.
Once you’re done, click on the Create Webhook button on the modal.
You can change the Webhook URL, Authorization Token, or enable/disable a webhook by clicking on the Webhook entry on the Developers Webhooks page.

Getting Started
Creating Card Programs
A Card Program is a centralized configuration that governs how a batch or category of cards is issued, funded, and controlled.

Each card issued under a program inherits the rules, funding logic, and spending limits defined at the program level, creating operational consistency and significantly reducing manual overhead. Learn how to create card program via the Sudo Dashboard or API.
​
1. Using the API
This document defines the technical and operational specification for the Virtual AfriGo Credit Cards program. The program is designed to issue virtual credit cards under the AfriGo network, issued in Nigeria (NGA) and denominated in Naira (NGN).
Optional spending controls are supported for enhanced security and card behavior customization. If not defined, a default control will be applied automatically.

curl
curl --location --request POST 'https://api.sandbox.sudo.cards/card-programs' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM=' \
--data-raw '{
"name": "Virtual AfriGo Credit Cards",
"reference": "250605-1051",
"description": "For Virtual AfriGo Credit Cards",
"status": "active",
"debitAccountId": "67974b365c184d20fc340889",
"fundingSourceId": "670cece725852ba485d745c7",
"issuerCountry": "NGA",
"currency": "NGN",
"cardBrand": "AfriGo",
"cardType": "virtual",
"spendingControls": {
  "channels": {
    "atm": true,
    "pos": true,
    "web": true,
    "mobile": true
  },
  "allowedCategories": [],
  "blockedCategories": [],
  "spendingLimits": [
    {
      "amount": 100000,
      "interval": "daily",
      "categories": []
    }
  ]
}
}'
A call to the card program’s endpoint returns information about the program that can be subsequently used to create a card.



Getting Started
Creating Cards
Learn how to create physical and virtual cards via the Sudo Dashboard or API.
​
1. Create a cardholder
A cardholder is either an individual or business entity that can be issued a payment card. To get started, create a cardholder with a name, billingAddress, and type.
You can include additional information like KYC details, phone number, and email address.

curl
curl --location --request POST 'https://api.sandbox.sudo.cards/customers' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM=' \
--data-raw '{
	"type": "individual",
	"name": "John Doe",
	"status": "active",
	"individual": {
		"firstName": "John",
		"lastName": "Doe"
	},
	"billingAddress": {
		"line1": "4 Barnawa Close",
		"line2": "Off Challawa Crescent",
		"city": "Barnawa",
		"state": "Kaduna",
		"country": "NG",
		"postalCode": "800001"
	}
}'
A call to the cardholder’s endpoint returns information about the cardholder that can be subsequently used to create a card.
​
2. Create a card for a cardholder
Create a card and assign it to a cardholder. This request requires the cardholder ID from the previous step, type, card number (if a physical card), currency, and status. More parameters might be required as per your requirements.

Create Card
 curl --location --request POST 'https://api.sandbox.sudo.cards/cards' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM' \
  --data-raw '{
  	"customerId": "5f8b75ef12a06df84bd7aa3a",
  	"type": "physical",
  	"number": "5061000001743021565",
  	"currency": "NGN",
  	"status": "active"
  }'

Virtual Card Using a Card Program
curl --location --request POST 'https://api.sandbox.sudo.cards/cards' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM' \
  --data-raw '{
  	"customerId": "670cf0ad25852ba485d7590d",
  	"programId": "6840b5161443c90831ba07a5",
  	"status": "active",
  	"metadata": {}
  }'

Physical Card Using a Card Program
curl --location --request POST 'https://api.sandbox.sudo.cards/cards' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM' \
  --data-raw '{
  	"customerId": "670cf0ad25852ba485d7590d",
  	"programId": "6840b5161443c90831ba07a5",
  	"number": "5061000001743021565",
  	"status": "active",
  	"metadata": {}
  }'
 
A call to the card’s endpoint returns information about the card being mapped.
In order to maintain PCI Compliance and high card data security, all requests to map or retrieve card details must be passed through the vault endpoint.




Getting Started
Onboarding
​
Checklist
Before we migrate you to the production environment (i.e., before you are able to onboard customers and issue live cards), you must complete the following items.
Create a Sudo account. Go to https://app.sudo.africa to create an account if you don’t already have one.
Setup and explore the sandbox environment (see below).
Check out the rest of this Guide and API Reference for more information on Sudo’s offerings.
Reach out to us by sending an email to [email protected] or via the live chat plugin on our websites to discuss any questions, concerns, or clarifications you might have.
Submit your business information for Sudo Compliance’s approval and production environment activation.
Setup production environment (see below).
Order physical cards or start generating virtual cards immediately.
​
Sandbox Environment Setup
Create a Sudo account. Go to https://app.sudo.africa to create an account if you don’t already have one.
Create an API Key. This can be done on the Dashboard’s Developers page.
Create a business account on SafeHaven and Connect it to your Sudo account. (Nigerian businesses only & optional on sandbox environment).
Create a default settlement account in the currency of your choice. This can be done on the Dashboard’s Accounts page or via the API.
Create a default funding source. This can be done on the Dashboard’s Settings (Funding Sources) page or via the API.
Create your first cardholder. See Create Customer
Use the simulator to generate a test card. See Generate Test Card
Create/Map your test cad to a cardholder. See Create Card
Use the simulator to make your first authorization. See Simulate Authorization
You’ve successfully tested Sudo on the Sandbox Environment. You can proceed to complete your integrations before switching to the production environment.
​
Production Environment Setup
NB: It is assumed that you already have a production-ready Sudo account. If you don’t have one, see the Checklist above.
Create an API Key. This can be done on the Dashboard’s Developers page.
Create a business account on SafeHaven and Connect it to your Sudo account (Nigerian businesses only).
Create a default settlement account in the currency of your choice. This can be done on the Dashboard’s Accounts page or via the API.
Create a default funding source. This can be done on the Dashboard’s Settings (Funding Sources) page or via the API.
Order Physical Sudo Cards by sending an email to [email protected] or via the live chat plugin on our websites.
Proceed to create a real cardholder, create cards, and try a real-life transaction at an ATM, POS, or Web platform.


Cards
Physical Cards
A physical card is a payment instrument that enables users to conduct transactions at merchant locations. The card can either be used physically on ATMs, POS, or virtually online.
The Sudo API enables you to control your cards programmatically, build your own features, securely integrate with other services, and create new world-class experiences.
A card stores data that is necessary for a merchant to make an authorization request. An authorization request occurs when a cardholder attempts a withdrawal at an automated teller machine (ATM), presents the card to a merchant at a physical point of sale (POS) or enters the card information into a form for online purchase.
Cards store multiple pieces of data necessary to complete a transaction, including the following:
Name - cardholder’s name.
Primary Account Number (PAN) - a 16-19 digits unique identifier that appears on the front or back of the card; identifies the card network, issuer, and cardholder account.
Expiry Date - the date when the card expires.
Card Verification Value (CVV2) - a 3 digits verification number that appears on the back of the card, usually used for “card not present (online)” transactions.
Personal Identification Number (PIN) - a 4 digits number used to authorize transactions either online or offline.
The Sudo API allows you to configure a phone number and email address during card setup to enroll for SafeToken (OTP) or 3D Secure. This is useful to protect the card against online card fraud where an OTP is sent to the customer’s mobile phone/email address to authorize any transaction before it is authorized.



Cards
Virtual Cards
Just like a physical card, a virtual card is a payment instrument that enables users to conduct transactions virtually online.
You can retrieve virtual card details via the Dashboard or via the API. PCI-DSS rules protect cardholder data. For PCI-DSS compliance, we recommend limiting retrieval of virtual card information to the dashboard. You can retrieve both the full unredacted card number and CVV2 from the API. For security reasons, these fields will be omitted unless you explicitly request them with the reveal property.

curl
curl --location --request GET 'https://vault.sandbox.sudo.cards/cards/5f8b75ef12a06df84bd7aa3a?reveal=true' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM=' \
In order to maintain PCI Compliance and high card data security, all requests to map or retrieve card details must be passed through the vault endpoint.


Cards
Displaying Sensitive Card Data
In order to display sensitive card data (card number, CVV2 and default PIN) to a customer, without any of it passing through your systems (which would subject you to PCI compliance requirements), Sudo utilizes a 3rd party service called Secure Proxy.
By default, sensitive card data are redacted in the response sent back from the card endpoints
Secure Proxy provides a JavaScript library called Secure Proxy Show which allows easy integration with your UI components. Secure Proxy Show offloads the PCI compliance burden by enabling the encrypted transmission of sensitive card data from Secure Proxy directly to your cardholder.
The Secure Proxy Show JavaScript library enables you to securely display sensitive data in a webpage while safely isolating that sensitive data from your systems. Secure Proxy Show JavaScript library injects a secure iframe into your HTML. Secure Proxy hosts both the iframe, and the data on secure, compliant servers.
How to Implement
Step 1 : Import the Secure Proxy Show Library using the scripts below according to your environment.
Environment	Script
Sandbox	<script type="text/javascript" src="https://js.securepro.xyz/sudo-show/1.1/ACiWvWF9tYAez4M498DHs.min.js"></script>
Live	<script type="text/javascript" src="https://js.securepro.xyz/sudo-show/1.1/ACiWvWF9tYAez4M498DHs.min.js"></script>
Step 2 : Initialize the component
const show = SecureProxy.create(<VAULT ID>);
Vault ID
Environment	ID
Sandbox	we0dsa28s
Live	vdl2xefo5
Step 3 : Create Card Token. You can do that here: Generate Card Token .
The card token is required in the authorization header of the show js request.
Step 4: Provide a valid card identifier
path: '/cards/<CARD ID>/secure-data/cvv2'

Example of displaying card number, cvv2 and PIN
  <!DOCTYPE html>
  <html>
  <head>
      <meta charSet="utf-8">
      <title></title>
      <style>
          iframe {
              height: 20px;
          }
      </style>
  </head>
  <body>
      <h2>Sensitive Data example</h2>
      
      <label>Card Number:</label>
      <div id="cardNumber"></div>
          
      <label>CVV2:</label>
      <div id="cvv2"></div>
      
      <label>Default PIN:</label>
      <div id="pin"></div>
      
      <script type="text/javascript" src="https://js.securepro.xyz/sudo-show/1.1/ACiWvWF9tYAez4M498DHs.min.js"></script>
      <script type="text/javascript">
          const vaultId = "we0dsa28s";
          const cvv2Secret = SecureProxy.create(vaultId);
          const numberSecret = SecureProxy.create(vaultId);
          const pinSecret = SecureProxy.create(vaultId);
          const cardToken = "<CARD TOKEN>";
          const cardId = "<CARD ID>";
          
          const cardNumberIframe = numberSecret.request({
              name: 'pan-text',
              method: 'GET',
              path: '/cards/'+ cardId + '/secure-data/number',
              headers: {
                  "Authorization": "Bearer " + cardToken
              },
              htmlWrapper: 'text',
              jsonPathSelector: 'data.number',
              serializers: [
                  numberSecret.SERIALIZERS.replace(
                  '(\\d{4})(\\d{4})(\\d{4})(\\d{4})',
                  '$1 $2 $3 $4 '
                  ),
              ]
          });
          cardNumberIframe.render('#cardNumber');

          const cvv2iframe = cvv2Secret.request({
              name: 'cvv-text',
              method: 'GET',
              path: '/cards/' + cardId + '/secure-data/cvv2',
              headers: {
                  "Authorization": "Bearer " + cardToken
              },
              htmlWrapper: 'text',
              jsonPathSelector: 'data.cvv2',
              serializers: []
          });
          cvv2iframe.render('#cvv2');

          const pinIframe = pinSecret.request({
              name: 'pin-text',
              method: 'GET',
              path: '/cards/'+ cardId + '/secure-data/defaultPin',
              headers: {
                  "Authorization": "Bearer " + cardToken
              },
              htmlWrapper: 'text',
              jsonPathSelector: 'data.defaultPin',
              serializers: []
          });
          pinIframe.render('#pin');
      </script>
  </body>
  </html>


  Controls
Spending Controls
Spending controls can be used to block business categories or set spending limits (e.g NGN1,000 per authorization or NGN30,000 per month). This can be applied to cards by setting the spendingControls object at creation or by updating it later.
If you’re using spending controls with real-time authorizations, spending controls run first and decline a purchase before the authorization.request event is sent to you, resulting in a declined authorization request.
​
Spending Control Object
Field	Type	Description
channels	Object	Channels selection where card can be used.
allowedCategories	Array	List of categories of authorizations to allow. All other categories will be blocked.
blockedCategories	Array	List of categories of authorizations to decline. All other categories will be allowed.
spendingLimits	Array	List of objects that specify amount-based rules.
​
Channels
To limit where the card can be used, set either true or false on the following variables.
Field	Type	Description
atm	Boolean	Automated teller machine (ATM) withdrawals and transactions
pos	Boolean	Point of sales (POS) purchases
web	Boolean	Online purchases
mobile	Boolean	Mobile purchases
​
Spending Limits
To limit the amount of money that can be spent, set spendingLimits within the spendingControls object to a list of objects with the following variables.
Field	Type	Description
amount	Number	Maximum amount allowed to spend per interval set.
interval	Enum	Time interval to which the amount applies. This can either be per_authorization, daily, weekly, monthly, yearly, or all_time.
categories	Array	List of categories of authorizations to limit. Leaving this field empty will apply the limit to all categories.
If spendingLimits are not set, a default spending limit is applied to all cards.
NGN Cards Single Transaction Limit - NGN20,000 (ATM) | NGN500,000 (POS/WEB) Daily Limit - NGN150,000 (ATM) | NGN500,000 (POS/WEB)
USD Cards Single Transaction Limit - USD0.00 (ATM) | USD0.00 (POS/WEB) Daily Limit - USD0.00 (ATM) | USD0.00 (POS/WEB)
Limit a card’s monthly spend

curl
curl --location --request PUT 'https://api.sandbox.sudo.africa/cards/5f45f4d018ccd82774de7d07' \
--header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM=' \
--header 'Content-Type: application/json' \
--data-raw '{
    "spendingControls": {
		"channels": {
			"atm": true,
			"pos": true,
			"web":  true,
      "mobile": true
		},
		"allowedCategories": [],
		"blockedCategories": [],
		"spendingLimits": [{
			"amount": 100000,
			"interval": "monthly"
		}]
	}
}'
Limit a card’s daily spend for specific categories

curl
```bash
curl --location --request PUT 'https://api.sandbox.sudo.africa/cards/5f45f4d018ccd82774de7d07' \
--header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM=' \
--header 'Content-Type: application/json' \
--data-raw '{
    "spendingControls": {
		"channels": {
			"atm": true,
			"pos": true,
			"web":  true,
      "mobile": true
		},
		"allowedCategories": [],
		"blockedCategories": [],
		"spendingLimits": [{
			"amount": 3000,
			"interval": "daily",
			"categories": ["6011"]
	****	}]
	}
}'
```


Controls
Funding Sources
A funding source represents a bank account from which funds are drawn for card transactions. There are 3 types of funding sources used on Sudo.
Default Funding Source
Account Funding Source
Gateway Funding Source
These funding sources can be set during card creation or update.
Funding sources are different from debitAccountId requested during card creation and funding. The debitAccountId refers to the _id of your business’ settlement account that would be charged strictly only during that card creation or funding process.
​
Default Funding Source
For this funding source, the funds are always taken from the customer’s wallet at the point of an authorization. This funding source is used by default during card creation/mapping, if no specific funding source is selected on the dashboard or added in the card object for the endpoint.
​
Account Funding Source
For this funding source, the funds are always taken from the business’ settlement account of the same currency at the point of an authorization. This means that if a business’ customer uses a card to purchase something, the business’ settlement account would be charged for this, not the customer’s wallet.
This is especially useful for businesses that wish to have more control over their customers’ card while using the dashboard.
​
Gateway Funding Source
This funding source is also similar to the account funding source, in the sense that, the business’ settlement account would also be charged for its customer’s transactions. But, the gateway funding source allows businesses to approve or decline transactions in real-time.
Therefore, it would be the best case for businesses that wish to work with the API directly, and/or maintain their customers wallet balances on their end.
While creating a Gateway Funding Source, if you set Authorized by Default to true it means transactions will be approved without waiting for your response.
For this funding source, a webhook url must be provided. This is where authorization requests would be sent during real-time authorizations. Click here to find out more on Real-time Authorizations.
In order to receive authorization requests, the webhook for the gateway funding source must be added during the funding source creation or update, on the Settings page, under the ‘Funding Sources’ tab.
For every card created or mapped to a customer, a corresponding wallet is also created, regardless of the funding source being used.

Controls
Real-time Authorizations
The Sudo API allows you to set up an asynchronous webhook to approve or decline transactions in real-time.
Your webhook endpoint can be set up by creating a funding source and setting that funding source while creating a new card or updating an existing one. Sudo creates and sends you an authorization.request event to approve or decline the authorization.
​
Authorization Requests
Your webhook must approve or decline each authorization request sent by responding with the appropriate response body. If Sudo does not receive a response from you within 4 seconds, the Authorization is automatically approved or declined based on your timeout settings in the card funding source.
If your main wallet balance does not have enough funds for the incoming authorization, it is automatically declined and you will not receive an event on your webhook.

javascript
let bodyParser      = require("body-parser");
let cors            = require("cors");
let express         = require("express");
let app             = express();

app.use(bodyParser());
app.use(cors());

app.get('/', (req, res) => {
    return res.json({
        foo: "Bar!"
    });
});

app.post('/sudo/jitgateway', (req, res) => {
    if(req.body.type === "card.balance") {
        res.status(200);
        res.json({
            statusCode: 200,
            responseCode: "00",
            data: {
                balance: 40000
            }
        });
    }else if(req.body.type === "authorization.request") {
        res.status(200);
        res.json({
            statusCode: 200,
            responseCode: "00",
            data: {
                metadata: {
                    foo: "bar"
                }
            }
        });
    }else {
        res.status(403);
        res.json({
            statusCode: 403,
            responseCode: "96",
            message: "Error"
        });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server's Up!");
});
In the example above, we set up an express server and exposed an endpoint /sudo/jitgateway to accept POST requests. This is listening to two event card.balance and authorization.request. Responding to the webhook request with a status 200 and a JSON body with statusCode 200 approves the authorization request.

javascript
{
    "statusCode":200,
    "responseCode":"00",
    "data":{
        "metadata":{
            "foo":"bar"
        }
    }
}
Optionally, you can add some metadata to the authorization request to be passed to the transaction eventually approved or an ISO 8583 responseCode to be returned for the authorization.

javascript
{
    "statusCode":400,
    "responseCode":"51"
}
The example response body above rejects a transaction with a response code 51 indicating Insufficient Balance.
​
Balance Requests
When a balance request is sent to your webhook, take a look at the user and account details then respond with the appropriate body indicating the user’s spendable balance.

json
{
    "business":"61cc42a046996fb949322a3e",
    "data":{
        "object":{
            "_id":"61ce491d9400b25b439ae426",
            "business":"61cc42a046996fb949322a3e",
            "customer":{
                "_id":"61ccdc228ce8d1fe6dceacf9",
                "business":"61cc42a046996fb949322a3e",
                "type":"individual",
                "name":"John Doe",
                "status":"active",
                "individual":{
                    "firstName":"John",
                    "lastName":"Doe",
                    "_id":"61ccdc228ce8d1fe6dceacfa"
                },
                "billingAddress":{
                    "line1":"4 Barnawa Close",
                    "line2":"Off Challawa Crescent",
                    "city":"Barnawa",
                    "state":"Kaduna",
                    "country":"Nigeria",
                    "postalCode":"800243",
                    "_id":"61ccdc228ce8d1fe6dceacfb"
                },
                "isDeleted":false,
                "createdAt":"2021-12-29T22:07:30.301Z",
                "updatedAt":"2021-12-29T22:07:30.301Z",
                "__v":0
            },
            "account":{
                "_id":"61ce491d9400b25b439ae424",
                "business":"61cc42a046996fb949322a3e",
                "type":"wallet",
                "currency":"NGN",
                "accountName":"SUDO / JOHN DOE",
                "bankCode":"999240",
                "accountType":"Current",
                "accountNumber":"8016065912",
                "currentBalance":0,
                "availableBalance":0,
                "provider":"SafeHaven",
                "providerReference":"61ce491d3153ed001e8425e2",
                "referenceCode":"subacc_1640909083619",
                "isDefault":true,
                "isDeleted":false,
                "createdAt":"2021-12-31T00:04:45.657Z",
                "updatedAt":"2021-12-31T00:04:45.657Z",
                "__v":0
            },
            "fundingSource":{
                "_id":"61ccdc118ce8d1fe6dceacf0",
                "business":"61cc42a046996fb949322a3e",
                "type":"gateway",
                "status":"active",
                "jitGateway":{
                    "url":"https://AfraidRoughRedundancy.aminubakori.repl.co/sudo/jitgateway",
                    "authorizationHeader":"Bearer ACME_TOKEN",
                    "authorizeByDefault":false,
                    "_id":"61ccdc118ce8d1fe6dceacf1"
                },
                "isDefault":false,
                "isDeleted":false,
                "createdAt":"2021-12-29T22:07:13.392Z",
                "updatedAt":"2021-12-29T22:07:13.392Z",
                "__v":0
            },
            "type":"physical",
            "brand":"Verve",
            "currency":"NGN",
            "maskedPan":"444444******4430",
            "expiryMonth":"01",
            "expiryYear":"2025",
            "status":"active",
            "spendingControls":{
                "channels":{
                    "atm":true,
                    "pos":true,
                    "web":true,
                    "mobile":true,
                    "_id":"61ce491d9400b25b439ae428"
                },
                "allowedCategories":[
                    
                ],
                "blockedCategories":[
                    
                ],
                "spendingLimits":[
                    {
                        "amount":1000,
                        "interval":"daily",
                        "categories":[
                            
                        ],
                        "_id":"61ce491d9400b25b439ae429"
                    }
                ],
                "_id":"61ce491d9400b25b439ae427"
            },
            "isDeleted":false,
            "createdAt":"2021-12-31T00:04:45.840Z",
            "updatedAt":"2021-12-31T00:04:45.840Z",
            "__v":0
        },
        "_id":"61d8f3cec46018873905a908"
    },
    "type":"card.balance",
    "pendingWebhook":false,
    "webhookArchived":false,
    "createdAt":1641608142,
    "_id":"61d8f3cec46018873905a907"
}
​
Authorization Requests
When an authorization request is sent to your webhook, the amount requested is stored in pendingRequest object.

json
{
    "environment":"development",
    "business":"61cc42a046996fb949322a3e",
    "data":{
        "object":{
            "_id":"61d8f42bc46018873905a955",
            "business":"61cc42a046996fb949322a3e",
            "customer":{
                "_id":"61ccdc228ce8d1fe6dceacf9",
                "business":"61cc42a046996fb949322a3e",
                "type":"individual",
                "name":"John Doe",
                "status":"active",
                "individual":{
                    "firstName":"John",
                    "lastName":"Doe",
                    "_id":"61ccdc228ce8d1fe6dceacfa"
                },
                "billingAddress":{
                    "line1":"4 Barnawa Close",
                    "line2":"Off Challawa Crescent",
                    "city":"Barnawa",
                    "state":"Kaduna",
                    "country":"Nigeria",
                    "postalCode":"800243",
                    "_id":"61ccdc228ce8d1fe6dceacfb"
                },
                "isDeleted":false,
                "createdAt":"2021-12-29T22:07:30.301Z",
                "updatedAt":"2021-12-29T22:07:30.301Z",
                "__v":0
            },
            "account":{
                "_id":"61ce491d9400b25b439ae424",
                "business":"61cc42a046996fb949322a3e",
                "type":"wallet",
                "currency":"NGN",
                "accountName":"SUDO / JOHN DOE",
                "bankCode":"999240",
                "accountType":"Current",
                "accountNumber":"8016065912",
                "currentBalance":0,
                "availableBalance":0,
                "provider":"SafeHaven",
                "providerReference":"61ce491d3153ed001e8425e2",
                "referenceCode":"subacc_1640909083619",
                "isDefault":true,
                "isDeleted":false,
                "createdAt":"2021-12-31T00:04:45.657Z",
                "updatedAt":"2021-12-31T00:04:45.657Z",
                "__v":0
            },
            "card":{
                "_id":"61ce491d9400b25b439ae426",
                "business":"61cc42a046996fb949322a3e",
                "customer":"61ccdc228ce8d1fe6dceacf9",
                "account":"61ce491d9400b25b439ae424",
                "fundingSource":{
                    "_id":"61ccdc118ce8d1fe6dceacf0",
                    "business":"61cc42a046996fb949322a3e",
                    "type":"gateway",
                    "status":"active",
                    "jitGateway":{
                        "url":"https://AfraidRoughRedundancy.aminubakori.repl.co/sudo/jitgateway",
                        "authorizationHeader":"Bearer ACME_TOKEN",
                        "authorizeByDefault":false,
                        "_id":"61ccdc118ce8d1fe6dceacf1"
                    },
                    "isDefault":false,
                    "isDeleted":false,
                    "createdAt":"2021-12-29T22:07:13.392Z",
                    "updatedAt":"2021-12-29T22:07:13.392Z",
                    "__v":0
                },
                "type":"physical",
                "brand":"Verve",
                "currency":"NGN",
                "maskedPan":"444444******4430",
                "expiryMonth":"01",
                "expiryYear":"2025",
                "status":"active",
                "spendingControls":{
                    "channels":{
                        "atm":true,
                        "pos":true,
                        "web":true,
                        "mobile":true,
                        "_id":"61ce491d9400b25b439ae428"
                    },
                    "allowedCategories":[
                        
                    ],
                    "blockedCategories":[
                        
                    ],
                    "spendingLimits":[
                        {
                            "amount":1000,
                            "interval":"daily",
                            "categories":[
                                
                            ],
                            "_id":"61ce491d9400b25b439ae429"
                        }
                    ],
                    "_id":"61ce491d9400b25b439ae427"
                },
                "isDeleted":false,
                "createdAt":"2021-12-31T00:04:45.840Z",
                "updatedAt":"2021-12-31T00:04:45.840Z",
                "__v":0
            },
            "amount":0,
            "fee":5,
            "vat":0.375,
            "approved":false,
            "currency":"NGN",
            "status":"pending",
            "authorizationMethod":"online",
            "balanceTransactions":[
                
            ],
            "merchantAmount":20,
            "merchantCurrency":"NGN",
            "merchant":{
                "category":"6010",
                "name":"SUDO SIMULATOR",
                "merchantId":"SUDOSIMULATOR01",
                "city":"JAHI",
                "state":"ABUJA",
                "country":"NG",
                "postalCode":"100001",
                "_id":"61d8f42bc46018873905a956"
            },
            "terminal":{
                "rrn":"126769857082",
                "stan":"192208",
                "terminalId":"3SUDOSIM",
                "terminalOperatingEnvironment":"on_premise",
                "terminalAttendance":"unattended",
                "terminalType":"ecommerce",
                "panEntryMode":"keyed_in",
                "pinEntryMode":"keyed_in",
                "cardHolderPresence":true,
                "cardPresence":true,
                "_id":"61d8f42bc46018873905a957"
            },
            "transactionMetadata":{
                "channel":"web",
                "type":"purchase",
                "reference":"0123456783126769857082",
                "_id":"61d8f42bc46018873905a958"
            },
            "pendingRequest":{
                "amount":25.375,
                "currency":"NGN",
                "merchantAmount":20,
                "merchantCurrency":"NGN",
                "_id":"61d8f42bc46018873905a959"
            },
            "requestHistory":[
                
            ],
            "verification":{
                "billingAddressLine1":"not_provided",
                "billingAddressPostalCode":"not_provided",
                "cvv":"match",
                "expiry":"match",
                "pin":"match",
                "threeDSecure":"not_provided",
                "safeToken":"not_provided",
                "authentication":"pin",
                "_id":"61d8f42bc46018873905a95a"
            },
            "isDeleted":false,
            "createdAt":"2022-01-08T02:17:15.075Z",
            "updatedAt":"2022-01-08T02:17:15.075Z",
            "feeDetails":[
                {
                    "contract":"61a18b8a4ddab599d20344a7",
                    "currency":"NGN",
                    "amount":5,
                    "description":"Verve Card Authorization Fee",
                    "_id":"61d8f42bc46018873905a95b"
                }
            ],
            "__v":0
        },
        "_id":"61d8f42bc46018873905a96f",
        "changes":" {\n-  amount: 0\n+  amount: 25.375\n-  approved: false\n+  approved: true\n-  status: \"pending\"\n+  status: \"approved\"\n-  pendingRequest: {\n-    amount: 25.375\n-    currency: \"NGN\"\n-    merchantAmount: 20\n-    merchantCurrency: \"NGN\"\n-    _id: \"61d8f42bc46018873905a959\"\n-  }\n+  pendingRequest: null\n   requestHistory: [\n+    {\n+      amount: 25.375\n+      currency: \"NGN\"\n+      approved: true\n+      merchantAmount: 20\n+      merchantCurrency: \"NGN\"\n+      reason: \"webhook_approved\"\n+      createdAt: \"2022-01-08T02:17:15.075Z\"\n+      _id: \"61d8f42cc46018873905a979\"\n+    }\n   ]\n }\n"
    },
    "type":"authorization.request",
    "pendingWebhook":false,
    "webhookArchived":false,
    "createdAt":1641608235,
    "_id":"61d8f42bc46018873905a96e"
}
The top-level amount in the request is set to 0 and approved is false. Once you respond to the request, the top-level amount reflects the total amount approved or declined, the approved field is updated, and pendingRequest is set to null.

Controls
Fraud Protection
Sudo automatically blocks any authorization that looks suspicious. If we decline the authorization attempt as a result of our fraud analysis, the requestHistory.reason field on the Authorization is set to suspected_fraud.

javascript
requestHistory: [
		{
				_id: "5f920639d466350ec7a8f0ff"
				amount: 505.375
				currency: "NGN"
				approved: false
				merchantAmount: 500
				merchantCurrency: "NGN"
				reason: "suspected_fraud"
				createdAt: "2020-10-22T22:22:49.157Z"
		}
]
Think a transaction was declined incorrectly? Please reach out to our support team with the details of the transaction.
​
Spending Controls
We recommend that you implement a combination of spending limits and merchant category controls on your cards to help limit your exposure in case fraud is attempted.
If spendingLimits are not set, a default spending limit is applied to all cards.
NGN Cards Single Transaction Limit - NGN20,000 (ATM) | NGN500,000 (POS/WEB) Daily Limit - NGN150,000 (ATM) | NGN500,000 (POS/WEB)
USD Cards Single Transaction Limit - USD0.00 (ATM) | USD0.00 (POS/WEB) Daily Limit - USD0.00 (ATM) | USD0.00 (POS/WEB)
​
Verification Data
For every authorization on Sudo Cards, we pass the verification, transactionMetadata, terminal, and merchant information to your webhook to make final decisions. You get to know the channel used, merchant name, location, and terminal details including the Terminal ID. We also send the card presence and cardholder presence status to you so you can make the right decisions before approving or declining a transaction.

javascript
"verification":{
    "_id":"5f920639d466350ec7a8f0f1",
    "billingAddressLine1":"not_provided",
    "billingAddressPostalCode":"not_provided",
    "cvv":"match",
    "expiry":"match",
    "pin":"match",
    "threeDSecure":"not_provided",
    "safeToken":"not_provided",
    "authentication":"pin"
}

...

"terminal":{
    "_id":"5f920639d466350ec7a8f0ee",
    "rrn":"201022232227",
    "stan":"280632",
    "terminalId":"2058VX16",
    "terminalOperatingEnvironment":"on_premise",
    "terminalAttendance":"attended",
    "terminalType":"pos",
    "panEntryMode":"magnetic_stripe",
    "pinEntryMode":"magnetic_stripe",
    "cardHolderPresence":true,
    "cardPresence":true
}

...

"merchant":{
    "_id":"5f920639d466350ec7a8f0ed",
    "category":"6051",
    "name":"SUDO AFRICA LIMITED",
    "merchantId":"2058FC017155567",
    "city":"FC",
    "state":"LA",
    "country":"NG",
    "postalCode":"100001"
}

...

"transactionMetadata":{
    "_id":"5f920639d466350ec7a8f0ef",
    "channel":"pos",
    "type":"purchase",
    "reference":"6050000406201022232227"
}
Sudo gives you a 4 seconds window to respond to any request. If we do not receive a response from you within such time, the Authorization is automatically approved or declined based on your timeout settings in the card funding source.


Purchases
Authorizations
When a card is used either at an ATM, POS or Online, an authorization request is made which is approved or declined based on the following steps.
User attempts to make a transaction at an ATM, POS or Online.
An Authorization object is created on Sudo.
Sudo checks to ensure the current available balance is sufficient for the transaction.
Sudo proceeds to check the card and cardholder status. We expect both to be active.
Sudo checks if spending controls should automatically decline the authorization.
Sudo then sends an authorization.request event which you are expected to either approve or decline.
If we do not receive a response from you within 4 seconds, the Authorization is automatically approved or declined based on your timeout settings as configured in the card funding source.
​
Approved Authorizations
Once an authorization request is made, the status on the authorization is set to pending, and the authorization.request webhook event is sent. On approval, the amount is deducted from your default available balance. A transaction is then created and the status of the authorization is set to closed.



Purchases
Transactions
Once an authorization request is approved, the status on the authorization is updated to pending, and the authorization.updated webhook event is sent. The amount is deducted from your default available balance. A transaction is then created and the status of the authorization is set to closed.
​
Refunds and Reversals
When a dispute is raised on a transaction or a reversal is initiated by the switching network, we create a new transaction it’s type is set to refund, and all amounts in positive. We keep every other detail as it is in the original transaction including the authorization that leads to the refund. We also send a transaction.refund event with the details of the refunded transaction to your webhook.

javascript
{
    ... 
    
    "amount": 10,
    "fee": 5,
    "vat": 0.375,
    "feeDetails": [
        {
            "_id": "5f9217807f397914cb365101",
            "contract": "5f919ef0d466350ec7a8f0b7",
            "currency": "NGN",
            "amount": 5,
            "description": "Naira Card Authorization Fee"
        }
    ],
    "currency": "NGN",
    "type": "refund",
    "merchantAmount": 10,
    "merchantCurrency": "NGN",
    "merchant": {
        "_id": "5f9217807f397914cb3650e8",
        "category": "7399",
        "name": "PayantTechnolog/FLW3518",
        "merchantId": "IPG000000000003",
        "city": "interswitchde",
        "state": "LA",
        "country": "NG",
        "postalCode": "100001"
    },
    "terminal": {
        "_id": "5f9217807f397914cb3650e9",
        "rrn": "001249814944",
        "stan": "280648",
        "terminalId": "3IPG0001",
        "terminalOperatingEnvironment": "off_premise",
        "terminalAttendance": "unattended",
        "terminalType": "adminstrative_terminal",
        "panEntryMode": "unknown",
        "pinEntryMode": "unknown",
        "cardHolderPresence": false,
        "cardPresence": false
    },
    "transactionMetadata": {
        "_id": "5f9217807f397914cb3650ea",
        "channel": "atm",
        "type": "purchase",
        "reference": "6050000406001249814944"
    },
    "isDeleted": false,
    "createdAt": "2020-10-23T00:56:16.113Z",
    "updatedAt": "2020-10-23T00:56:16.113Z",
    "__v": 0
}
```



Purchases
Disputes
Customers are generally allowed to log disputes on transactions when they have dispense errors at an ATM, POS, or Online, when they have problems with the quality or delivery of goods and services they ordered or when they notice a fraudulent transaction on their cards.
Sudo provides an easy way of reporting such transactions for further investigations. The process usually takes 24-48 hours and all disputes must be reported within 24 hours of making such transactions.
To submit a dispute, log in to the Sudo Dashboard or access the disputes API.


Purchases
Testing
Sudo provides an easy way to generate cards and simulate transactions in a sandbox environment. This allows you to test your integrations and ensure that everything works as expected before going live making real transactions.
You can simulate card transactions using your sandbox credentials as seen on your dashboard with these steps:
Fund your default account.
Create a funding source.
Create a cardholder.
Generate a sample card.
Create/Map card to a cardholder.
Simulate your first card transaction.
​
1. Fund your default account.
To fund your default account, get the list of all accounts and note the _id, accountNumber, and bankCode of the default account. Then proceed to make a transfer to the account in LIVE or fund using the sandbox simulator.

curl
curl --location --request GET 'https://api.sandbox.sudo.cards/accounts?page=0&limit=25' \
--header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM=' \
Then proceed to make funding using the sandbox simulator.

curl
curl --location --request POST 'https://api.sandbox.sudo.cards/accounts/simulator/fund' \
--header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM=' \
--header 'Content-Type: application/json' \
--data-raw '{
    "accountId": "{{defaultAccountId}}",
    "amount": 5000.00
}'
​
2. Create a funding source.
When you set authorizeByDefault to true, all transactions get approved without waiting for your response. We will re-attempt to send the completed authorization request to your webhook after the transaction is completed.

curl
curl --location --request POST 'https://api.sandbox.sudo.cards/fundingsources' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM=' \
--data-raw '{
	"type": "gateway",
	"status": "active",
	"jitGateway": {
		"url": "https://api.domain.tld/sudo/jitgateway",
		"authorizationHeader": "Bearer MY_TOKEN",
    "authorizeByDefault": false
	}
}'
​
3. Create a cardholder.
A cardholder is either an individual or business entity that can be issued a payment card. To get started, create a cardholder with name, billingAddress and type.
You can include additional information like KYC details, phone number, and email address. See Customers under the API Reference.

curl
curl --location --request POST 'https://api.sandbox.sudo.africa/customers' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM=' \
--data-raw '{
	"type": "individual",
	"name": "John Doe",
	"status": "active",
	"individual": {
		"firstName": "John",
		"lastName": "Doe"
	},
	"billingAddress": {
		"line1": "4 Barnawa Close",
		"line2": "Off Challawa Crescent",
		"city": "Barnawa",
		"state": "Kaduna",
		"country": "NG",
		"postalCode": "800001"
	}
}'
​
4. Generate a sample card.
For physical cards, a card is needed before mapping. To generate a card on the sandbox environment, send a request to the card generation endpoint.

curl
curl --location --request GET 'https://api.sandbox.sudo.cards/cards/simulator/generate' \
--header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM=' \
​
5. Create/Map card to a cardholder.
This request requires the cardholder ID from the previous step, type, card number (if a physical card), currency, and status.

curl
curl --location --request POST 'https://vault.sandbox.sudo.cards/cards' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM=' \
--data-raw '{
	"customerId": "5f8b75ef12a06df84bd7aa3a",
	"type": "physical",
	"number": "5061000001743021565",
	"currency": "NGN",
	"status": "active"
}'
Make your first card transaction.
To make your first card transaction, proceed to simulate a transaction using the simulation endpoint.
Proceed to make your first transaction at an ATM, POS, or Online using your card.

curl
curl --location --request POST 'https://api.sudo.africa/cards/simulator/authorization' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer ••••••••••••••••••••••••••••••••••••CREE1M0EwQjgyMjI0NUE3QUM=' \
--data-raw '{
		"cardId": "5f90f250349360504cf82619",
    "channel": "web",
    "type": "purchase",
    "amount": 3500,
    "currency": "NGN",
    "merchant": {
        "category": "7399",
        "merchantId": "000000001",
        "name": "Acme Inc",
        "city": "Barnawa",
        "state": "KD",
        "country": "NG"
    }
}'



Purchases
Merchant Categories
A merchant category code (MCC) is a four-digit number assigned by card networks to a business based on the goods or services offered by the business. You can use these categories when creating spending controls to restrict issued cards from being used with certain business types.
For easy reference, see the files below.
mcc.js
mcc.pdf


Webhooks
Authorization Request
This webhook request is triggered whenever a transaction is attempted on a card. The event type is authorization.request
This type of webhook is only applicable for Cards using the Gateway Funding Source
When you receive this type of event, you’re expected to respond to the webhook, either to authorize or decline the transaction.
​
Response Sample

Approve

Decline (Insuffient Funds)
{
    "statusCode": 200,
    "data": {
        "responseCode": "00"
    }
}
Please be advised to use ISO 8583 Response Codes
​
Request Payload

json
{
    "environment": "development",
    "business": "670cec9d25852ba485d74273",
    "data": {
        "object": {
            "_id": "67af0942376903b183b034b4",
            "business": "670cec9d25852ba485d74273",
            "customer": {
                "_id": "670cf0ad25852ba485d7590d",
                "business": "670cec9d25852ba485d74273",
                "type": "individual",
                "name": "Shamsuddeen Omacy",
                "phoneNumber": "+234 801234567",
                "emailAddress": "john@doe.com",
                "status": "active",
                "individual": {
                    "firstName": "Shamsuddeen",
                    "lastName": "Omacy",
                    "dob": "1996-10-23T10:20:11.998Z",
                    "identity": {
                        "type": "BVN",
                        "number": "3434343e434",
                        "_id": "670cf0ad25852ba485d7590f"
                    },
                    "documents": {
                        "_id": "670cf0ad25852ba485d75910"
                    },
                    "_id": "670cf0ad25852ba485d7590e"
                },
                "billingAddress": {
                    "line1": "Ademola Ade. Cres.",
                    "line2": "",
                    "city": "Wuse 2",
                    "state": "FCT",
                    "country": "Nigeria",
                    "postalCode": "662222",
                },
                "isDeleted": false,
                "createdAt": "2024-10-14T10:21:33.674Z",
                "updatedAt": "2024-10-14T10:21:33.674Z",
            },
            "account": {
                "_id": "670cf0d425852ba485d75aa3",
                "business": "670cec9d25852ba485d74273",
                "type": "wallet",
                "currency": "NGN",
                "accountName": "SUDO / Shamsuddeen Omacy",
                "bankCode": "999240",
                "accountType": "Current",
                "accountNumber": "8022418098",
                "currentBalance": 0,
                "availableBalance": 0,
                "provider": "SafeHaven",
                "providerReference": "670cf0d33011ac0024537c52",
                "referenceCode": "subacc_1728901330971",
                "reloadable": true,
                "isDefault": true,
                "isDeleted": false,
                "createdAt": "2024-10-14T10:22:12.442Z",
                "updatedAt": "2024-10-14T10:22:12.442Z",
                "charges": [],
                "__v": 0
            },
            "card": {
                "_id": "670cf0d525852ba485d75ab9",
                "business": "670cec9d25852ba485d74273",
                "customer": "670cf0ad25852ba485d7590d",
                "account": "670cf0d425852ba485d75aa3",
                "fundingSource": {
                    "_id": "670cece725852ba485d745c7",
                    "business": "670cec9d25852ba485d74273",
                    "type": "gateway",
                    "status": "active",
                    "jitGateway": {
                        "url": "https://webhook.site/07a630d9-ea61-47bc-a14e-e7e7857bea6e",
                        "authorizationHeader": "***",
                        "authorizeByDefault": false,
                        "_id": "670cece725852ba485d745c8"
                    },
                    "isDefault": false,
                    "isDeleted": false,
                    "createdAt": "2024-10-14T10:05:27.926Z",
                    "updatedAt": "2025-02-14T09:12:43.761Z",
                    "__v": 0
                },
                "type": "virtual",
                "brand": "Verve",
                "currency": "NGN",
                "maskedPan": "506321******3531",
                "expiryMonth": "06",
                "expiryYear": "25",
                "status": "active",
                "is2FAEnabled": true,
                "is2FAEnrolled": true,
                "isDefaultPINChanged": true,
                "disposable": false,
                "refundAccount": null,
                "isDeleted": false,
                "createdAt": "2024-10-14T10:22:13.170Z",
                "updatedAt": "2024-11-26T03:33:55.778Z",
                "__v": 0
            },
            "amount": 0,
            "fee": 5,
            "vat": 0,
            "approved": false,
            "currency": "NGN",
            "status": "pending",
            "authorizationMethod": "chip",
            "balanceTransactions": [],
            "merchantAmount": 1000,
            "merchantCurrency": "NGN",
            "merchant": {
                "category": "7399",
                "name": "SUDO SIMULATOR",
                "merchantId": "SUDOSIMULATOR01",
                "city": "JAHI",
                "state": "AB",
                "country": "NG",
                "postalCode": "100001",
                "_id": "67af0942376903b183b034b5"
            },
            "terminal": {
                "rrn": "142123123678",
                "stan": "102007",
                "terminalId": "2SUDOSIM",
                "terminalOperatingEnvironment": "on_premise",
                "terminalAttendance": "unattended",
                "terminalType": "pos",
                "panEntryMode": "magnetic_stripe",
                "pinEntryMode": "magnetic_stripe",
                "cardHolderPresence": true,
                "cardPresence": true,
                "_id": "67af0942376903b183b034b6"
            },
            "transactionMetadata": {
                "channel": "pos",
                "type": "purchase",
                "reference": "8022418098142123123678",
                "_id": "67af0942376903b183b034b7"
            },
            "pendingRequest": {
                "amount": 1005,
                "currency": "NGN",
                "merchantAmount": 1000,
                "merchantCurrency": "NGN",
                "_id": "67af0942376903b183b034b8"
            },
            "requestHistory": [],
            "verification": {
                "billingAddressLine1": "not_provided",
                "billingAddressPostalCode": "not_provided",
                "cvv": "match",
                "expiry": "match",
                "pin": "match",
                "threeDSecure": "not_provided",
                "safeToken": "match",
                "authentication": "pin",
                "_id": "67af0942376903b183b034b9"
            },
            "isDeleted": false,
            "createdAt": "2025-02-14T09:13:38.093Z",
            "updatedAt": "2025-02-14T09:13:38.093Z",
            "feeDetails": [{
                "contract": "61a18b8a4ddab599d20344a7",
                "currency": "NGN",
                "amount": 5,
                "description": "Verve Card Authorization Fee",
                "_id": "67af0942376903b183b034ba"
            }],
            "__v": 0
        },
        "_id": "67af0942376903b183b034cd"
    },
    "type": "authorization.request",
    "pendingWebhook": false,
    "webhookArchived": false,
    "createdAt": 1739524418,
    "_id": "67af0942376903b183b034cc"
}


Webhooks
Successful Transaction
This webhook request is triggered whenever a successful transaction happened on a card. The event type is transaction.created
​
Request Payload

json
{
    "environment": "production",
    "business": "xxxxxxxxxxxxx",
    "data": {
        "object": {
            "business": "xxxxxxxxxxxxx",
            "customer": "xxxxxxxxxxxxx",
            "account": "xxxxxxxxxxxxx",
            "card": "xxxxxxxxxxxxx",
            "authorization": null,
            "amount": -0.15,
            "fee": 0,
            "vat": 0,
            "feeDetails": [],
            "currency": "USD",
            "type": "capture",
            "balanceTransactions": [],
            "merchantAmount": -0.15,
            "merchantCurrency": "USD",
            "merchant": {
                "category": "5399",
                "name": "Paystack",
                "merchantId": "-",
                "city": "Ikeja GRA ",
                "state": "-",
                "country": "NG",
                "postalCode": "-",
                "_id": "664b4cd13fc1976f98ce6cd0"
            },
            "terminal": {
                "rrn": "88081577-3e50-4567-a990-712d31fd1759",
                "stan": "-",
                "terminalId": "-",
                "terminalOperatingEnvironment": "off_premise",
                "terminalAttendance": "unattended",
                "terminalType": "ecommerce",
                "panEntryMode": "keyed_in",
                "pinEntryMode": "keyed_in",
                "cardHolderPresence": false,
                "cardPresence": false,
                "_id": "664b4cd13fc1976f98ce6cd1"
            },
            "transactionMetadata": {
                "channel": "web",
                "type": "purchase",
                "reference": "88081577-3e50-4567-a990-712d31fd1759",
                "_id": "664b4cd13fc1976f98ce6cd2"
            },
            "isDeleted": false,
            "createdAt": "2024-05-20T13:14:57.730Z",
            "updatedAt": "2024-05-20T13:14:57.730Z",
            "_id": "664b4cd13fc1976f98ce6ccf",
            "__v": 0
        },
        "_id": "664b4cd13fc1976f98ce6cd6"
    },
    "type": "transaction.created",
    "pendingWebhook": true,
    "webhookArchived": false,
    "createdAt": 1716210897,
    "_id": "xxxxxxxxxxxxx",
    "__v": 0
}


Webhooks
Failed Transaction
This webhook request is triggered whenever an attempt to charge a card fails. The event type is authorization.decline
​
Request Payload

json
{
    "type": "authorization.declined",
    "environment": "production",
    "business": "xxxxxxxxxxxxx",
    "_id": "xxxxxxxxxxxxx",
    "data": {
        "object": {
            "business": "xxxxxxxxxxxxx",
            "customer": "xxxxxxxxxxxxx",
            "account": "xxxxxxxxxxxxx",
            "card": "xxxxxxxxxxxxx",
            "amount": -25.49,
            "fee": 0,
            "vat": 0,
            "approved": false,
            "currency": "USD",
            "status": "pending",
            "authorizationMethod": "online",
            "balanceTransactions": [],
            "merchantAmount": -25.49,
            "merchantCurrency": "USD",
            "merchant": {},
            "terminal": {},
            "transactionMetadata": {},
            "pendingRequest": null,
            "requestHistory": [{
                "amount": 25.49,
                "currency": "USD",
                "approved": false,
                "merchantAmount": 25.49,
                "merchantCurrency": "USD",
                "reason": "not_allowed",
                "narration": "No sufficient funds",
                "createdAt": "2024-05-20T13:40:25.079Z",
                "_id": "664b52c9c05d4a5d3f8cc734"
            }],
            "verification": {},
            "isDeleted": false,
            "createdAt": "2024-05-20T13:40:25.079Z",
            "updatedAt": "2024-05-20T13:40:25.079Z",
            "_id": "664b52c9c05d4a5d3f8cc730",
            "feeDetails": [],
            "__v": 0
        },
        "_id": "664b52c9c05d4a5d3f8cc740"
    }
}


Webhooks
Transaction Refund
This webhook request is triggered whenever a card was charged successful, but the transaction failed at a point or after chargeback dispute. The event type is transaction.refund
​
Request Payload

json
{
    "environment": "production",
    "business": "xxxxxxxxxxxxxxxxxxxxx",
    "data": {
        "object": {
            "_id": "xxxxxxxxxxxxxxxxxxxxx",
            "business": "xxxxxxxxxxxxxxxxxxxxx",
            "customer": "xxxxxxxxxxxxxxxxxxxxx",
            "account": "xxxxxxxxxxxxxxxxxxxxx",
            "card": "xxxxxxxxxxxxxxxxxxxxx",
            "authorization": "xxxxxxxxxxxxxxxxxxxxx",
            "amount": 20005,
            "fee": 5,
            "vat": 0,
            "feeDetails": [{
                "contract": "61a18b8a4ddab599d20344a7",
                "currency": "NGN",
                "amount": 5,
                "description": "Verve Card Authorization Fee",
                "_id": "66d39a9a74ffd5590104310d"
            }],
            "currency": "NGN",
            "type": "refund",
            "balanceTransactions": [],
            "merchantAmount": 20000,
            "merchantCurrency": "NGN",
            "merchant": {
                "category": "6014",
                "name": "T Jeezy Communicati 017",
                "merchantId": "2TEPLA000000002",
                "city": "225 2TEP6ZJD",
                "state": "LA",
                "country": "NG",
                "postalCode": "100001",
                "_id": "66d39a9274ffd559010430a4"
            },
            "terminal": {
                "rrn": "000000017225",
                "stan": "017225",
                "terminalId": "2TEP6ZJD",
                "terminalOperatingEnvironment": "on_premise",
                "terminalAttendance": "attended",
                "terminalType": "pos",
                "panEntryMode": "magnetic_stripe",
                "pinEntryMode": "magnetic_stripe",
                "cardHolderPresence": true,
                "cardPresence": true,
                "_id": "66d39a9274ffd559010430a5"
            },
            "transactionMetadata": {
                "channel": "pos",
                "type": "payment",
                "reference": "9160060154000000017225",
                "_id": "66d39a9274ffd559010430a6"
            },
            "isDeleted": false,
            "createdAt": "2024-09-02T20:17:55.766Z",
            "updatedAt": "2024-09-02T20:17:55.766Z",
            "__v": 0
        }
    },
    "_id": "xxxxxxxxxxxxxxxxxxxxx",
    "type": "transaction.refund",
    "pendingWebhook": true,
    "webhookArchived": false,
    "createdAt": 1716210897,
    "__v": 0
}


Webhooks
Balance Enquiry
This webhook request is triggered whenever balance enquiry is performed on a card. The event type is card.balance
This type of webhook is only applicable for Cards using the Gateway Funding Source
When you receive this type of event, you’re expected to respond to the webhook containing the card balance.
​
Request Payload

json
{
    "business": "xxxxxxxxsxxxxxxx",
    "data": {
        "object": {
            "_id": "61e02652bdf6466e4ff94921",
            "business": "xxxxxxxxsxxxxxxx",
            "customer": {
                "_id": "61deecfb51eac6c9d0a49d54",
                "business": "xxxxxxxxsxxxxxxx",
                "type": "individual",
                "name": "Shamsuddeen Omacy",
                "status": "active",
                "individual": {
                    "firstName": "Shamsuddeen",
                    "lastName": "Omacy",
                    "_id": "61deecfb51eac6c9d0a49d55"
                },
                "billingAddress": {
                    "line1": "4 Barnawa Close",
                    "line2": "Off Challawa Crescent",
                    "city": "Barnawa",
                    "state": "Kaduna",
                    "country": "Nigeria",
                    "postalCode": "800243",
                    "_id": "61deecfb51eac6c9d0a49d56"
                },
                "isDeleted": false,
                "createdAt": "2024-01-12T15:00:11.745Z",
                "updatedAt": "2024-01-12T15:00:11.745Z",
                "__v": 0
            },
            "account": {
                "_id": "61e02652bdf6466e4ff9491f",
                "business": "xxxxxxxxsxxxxxxx",
                "type": "wallet",
                "currency": "NGN",
                "accountName": "BITAKO / SHAMSUDDEEN OMACY",
                "bankCode": "999240",
                "accountType": "Current",
                "accountNumber": "8017418065",
                "currentBalance": 0,
                "availableBalance": 0,
                "provider": "SafeHaven",
                "providerReference": "61e026526c14e4001ec12ea4",
                "referenceCode": "subacc_1642079825141",
                "isDefault": true,
                "isDeleted": false,
                "createdAt": "2024-11-13T13:17:06.606Z",
                "updatedAt": "2024-11-13T13:17:06.606Z",
                "__v": 0
            },
            "fundingSource": {
                "_id": "61deec9a5454549d0a49d04",
                "business": "xxxxxxxxsxxxxxxx",
                "type": "gateway",
                "status": "active",
                "jitGateway": {
                    "url": "",
                    "authorizationHeader": "Bearer ",
                    "authorizeByDefault": false,
                    "_id": "61deec9a51eac6c9d0a49d05"
                },
                "isDefault": false,
                "isDeleted": false,
                "createdAt": "2024-01-12T14:58:34.348Z",
                "updatedAt": "2024-01-12T14:58:34.348Z",
                "__v": 0
            },
            "type": "virtual",
            "brand": "Verve",
            "currency": "NGN",
            "maskedPan": "507874******5244",
            "expiryMonth": "11",
            "expiryYear": "2027",
            "status": "active",
            "spendingControls": {
                "channels": {
                    "atm": true,
                    "pos": true,
                    "web": true,
                    "mobile": true,
                    "_id": "61e02652bdf6466e4ff94923"
                },
                "allowedCategories": [],
                "blockedCategories": [],
                "spendingLimits": [{
                    "amount": 500,
                    "interval": "daily",
                    "categories": [],
                    "_id": "61e02652bdf6466e4ff94924"
                }],
                "_id": "61e02652bdf6466e4ff94922"
            },
            "isDeleted": false,
            "createdAt": "2024-11-13T13:17:06.808Z",
            "updatedAt": "2024-11-13T13:17:06.808Z",
            "__v": 0
        },
        "_id": "61e0282e709508625af2fad6"
    },
    "type": "card.balance",
    "pendingWebhook": false,
    "webhookArchived": false,
    "createdAt": 1742080302,
    "_id": "61e0282e709508625af2fad5"
}
The field data.object._id identifies the Card ID
​
Response Sample

Approve
{
    "statusCode": 200,
    "data": {
        "responseCode": "00",
        "balance": 1234
    }
}


Webhooks
Card Termination
This is a webhook triggered for when a card is terminated. The event type is card.terminated

json
{
    "type": "card.terminated",
    "environment": "production",
    "business": "xxxxxxxxxxxxx",
    "data": {
        "_id": "63edff25e63a129196e34c62",
        "business": "xxxxxxxxxxxxx",
        "customer": "xxxxxxxxxxxxx",
        "account": "xxxxxxxxxxxxx",
        "fundingSource": "xxxxxxxxxxxxx",
        "type": "virtual",
        "brand": "MasterCard",
        "currency": "USD",
        "maskedPan": "519075*******3531",
        "last4": "3531",
        "expiryMonth": "11",
        "expiryYear": "2027",
        "status": "canceled",
        "balance": 12.34
    }
}





THIS IS THE CARD PROGRAM FORM. GIVE ME THE INFORMATION TO FILL HERE SO I CAN PROVIDE YOU THE ID.

Create A Card Program
Enter the following information to create a new card program for your business.

Name
e.g My VISA Card Program

Unique Reference
SUDO-RFTL-1765729342163

Description
(Optional)
e.g A description for my to help me identify my card program.

Funding Source
default funding source

Card Brand
Map Physical Card

Card Brand
Verve
AfriGo

Issuer Country
🇳🇬
Nigeria


Currency
NGN
Debit Account

You do not have a NGN settlement account created. Please create an one.
Create Card Program




VIRTUAL CARD PROGRAM

Create A Card Program
Enter the following information to create a new card program for your business.

Name
e.g My VISA Card Program

Unique Reference
SUDO-RFTL-1765729342163

Description
(Optional)
e.g A description for my to help me identify my card program.

Funding Source
default funding source

Card Brand
Create Virtual Card

Card Brand
Verve
VISA
MasterCard
AfriGo

Issuer Country
🇳🇬
Nigeria


Currency
NGN
Debit Account

You do not have a NGN settlement account created. Please create an one.
Create Card Program














