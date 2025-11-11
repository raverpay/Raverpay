Authentication
The VTpass Messaging API uses a header keys authentication. This means that you will be passing certain keys through the header while making a request to the VTpass messaging API.

The keys are namely:

X-Token (This will be your Public Key)
X-Secret (This will be your Secret Key)
The Public and Secret Key can be gotten from your Messaging Dashboard by clicking on the eye icon under the Keys column.

Send SMS (NORMAL)
Using a GET method, you can send notification SMS to your customers on VTpass Messaging using the API end point below:

Live URL: https://messaging.vtpass.com/v2/api/sms/sendsms

Authentication

Make sure to pass your Public Key and Secret Key as Authentication in the header to access the API

header: {
X-Token: VT_PK_XXXXXXXXXXXXXXXXXXXXXXX
X-Secret: VT_SK_XXXXXXXXXXXXXXXXXXXXXX
}

Request Pattern:
This endpoint allows you to send sms messages to your users on VTpass Messaging, you may hit the sendsms endpoint while passing your keys via the header as shown above: Request body type should be Content-Type: application/x-www-form-urlencoded

POST URL: https://messaging.vtpass.com/v2/api/sms/sendsms

FIELDS Mandatory/Optional TYPE DESCRIPTION
sender M string This specify the sender name registered on the platform. For an example, it can be VTpass.
recipient M string This is the phone number(s) of your users and can be sent as a string joined by commas (,) without spaces for more than one phone number. This can be 11 digits (or more for foreign numbers). For example: 08012345678,2347012345678,233500012223
message M string This is the message content you wish to send to your users. This can be one or more of OTP, post transaction SMS, Marketing campaign SMS, Promo SMS, etc.
responsetype O string This is the type or pattern of response you are comfortable with or your platform best understands. This can be one of json, text or xml.
NOTE: By default, our API returns text as responseType
dlr O string Delivery Report(dlr)
(1)-: specified you want to start receiving delivery report on every sent message.
(0)-: specified you do not want delivery report.
clientbatchid O string 299009
Client Batch ID specifies the unique id you wish to identify your batch sms messages with.

Expected Response:
TEXT RESPONSE:

TG00-MESSAGE PROCESSED:0000|2347061933309|1623425963075808467849264|SENT|MESSAGE SENT TO PROVIDER|MTNNG|NIGERIA
|999|0000-00-00 00:00:00

JSON RESPONSE:

{
"responseCode": "TG00",
"response": "MESSAGE PROCESSED",
"batchId": 5463323,
"clientBatchId": null,
"sentDate": "2021-06-11 16:36:45",
"messages": [
{
"statusCode": "0000",
"recipient": "2347061933309",
"messageId": "1623425805438752507784251",
"status": "SENT",
"description": "MESSAGE SENT TO PROVIDER",
"network": "MTNNG",
"country": "NIGERIA\r",
"deliveryCode": "999",
"deliveryDate": "0000-00-00 00:00:00",
"bulkId": "1623425805465161413"
}
]
}

XML RESPONSE:

<?xml version="1.0"?>
<root>
   <responseCode>TG00</responseCode>
   <response>MESSAGE PROCESSED</response>
   <clientId>5463326</clientId>
   <clientBatchId />
   <sentDate>2021-06-11 16:40:33</sentDate>
   <messages>
	<item>
	   <statusCode>0000</statusCode>
	   <recipient>2347061933309</recipient>
	   <messageId>1623426033925937673946634</messageId>
	   <status>SENT</status>
	   <description>MESSAGE SENT TO PROVIDER</description>
	   <network>MTNNG</network>
	   <country>NIGERIA</country>
	   <deliveryCode>999</deliveryCode>
	   <deliveryDate>0000-00-00 00:00:00</deliveryDate>
	   <bulkId>1623426033496476560</bulkId>
	</item>
   </messages>
</root>

Send SMS (SIMHOST)
Using a GET method, you can send notification SMS to your customers on VTpass Messaging using the API end point below:

Live URL: https://messaging.vtpass.com/api/sms/simhost-route

Authentication

Make sure to pass your Public Key and Secret Key as Authentication in the header to access the API

header: {
X-Token: VT_PK_XXXXXXXXXXXXXXXXXXXXXXX
X-Secret: VT_SK_XXXXXXXXXXXXXXXXXXXXXX
}

Request Pattern:
This endpoint allows you to send sms messages to your users on VTpass Messaging, you may hit the sendsms endpoint while passing your keys via the header as shown above:

URL: https://messaging.vtpass.com/api/sms/simhost-route?sender={sender}&recipient={recipient}&message={message}&responsetype={responsetype}

FIELDS Mandatory/Optional TYPE DESCRIPTION
sender M string This is the name your users will see on their mobile phone as the sender of this SMS. For an example, it can be VTpass.
recipient M string This is the phone number(s) of your users and can be sent as a string joined by commas (,) without spaces for more than one phone number. This can be 11 digits (or more for foreign numbers). For example: 08012345678,2347012345678,233500012223
message M string This is the message content you wish to send to your users. This can be one or more of OTP, post transaction SMS, Marketing campaign SMS, Promo SMS, etc.
projectId O string This is the project ID
responsetype O string This is the type or pattern of response you are comfortable with or your platform best understands. This can be one of json, text or xml.
NOTE: By default, our API returns text as responseType

Expected Response:
TEXT RESPONSE:

TG00-MESSAGE PROCESSED:0000|2347061933309|1623425963075808467849264|SENT|MESSAGE SENT TO PROVIDER|MTNNG|NIGERIA
|999|0000-00-00 00:00:00

JSON RESPONSE:

{
"responseCode": "TG00",
"response": "MESSAGE PROCESSED",
"batchId": 5463323,
"clientBatchId": null,
"sentDate": "2021-06-11 16:36:45",
"messages": [
{
"statusCode": "0000",
"recipient": "2347061933309",
"messageId": "1623425805438752507784251",
"status": "SENT",
"description": "MESSAGE SENT TO PROVIDER",
"network": "MTNNG",
"country": "NIGERIA\r",
"deliveryCode": "999",
"deliveryDate": "0000-00-00 00:00:00",
"bulkId": "1623425805465161413"
}
]
}

XML RESPONSE:

<?xml version="1.0"?>
<root>
   <responseCode>TG00</responseCode>
   <response>MESSAGE PROCESSED</response>
   <clientId>5463326</clientId>
   <clientBatchId />
   <sentDate>2021-06-11 16:40:33</sentDate>
   <messages>
	<item>
	   <statusCode>0000</statusCode>
	   <recipient>2347061933309</recipient>
	   <messageId>1623426033925937673946634</messageId>
	   <status>SENT</status>
	   <description>MESSAGE SENT TO PROVIDER</description>
	   <network>MTNNG</network>
	   <country>NIGERIA</country>
	   <deliveryCode>999</deliveryCode>
	   <deliveryDate>0000-00-00 00:00:00</deliveryDate>
	   <bulkId>1623426033496476560</bulkId>
	</item>
   </messages>
</root>

Send SMS (DND) V2
Using a GET method, you can send notification SMS to your customers whose phone numbers are placed on the Do-Not-Disturb (DND) mode on VTpass Messaging using the API end point below:

Live URL: https://messaging.vtpass.com/v2/api/sms/dnd-route

NOTE: This route attracts a higher rate (most likely twice as much as the normal route) per SMS page sent

Authentication

Make sure to pass your Public Key and Secret Key as Authentication in the header to access the API

header: {
X-Token: VT_PK_XXXXXXXXXXXXXXXXXXXXXXX
X-Secret: VT_SK_XXXXXXXXXXXXXXXXXXXXXX
}

Request Pattern:
This endpoint allows you to send sms messages to your users on VTpass Messaging, you may hit this endpoint while passing your keys via the header as shown above: Request body type should be Content-Type: application/x-www-form-urlencoded.

POST URL: https://messaging.vtpass.com/v2/api/sms/dnd-route

FIELDS Mandatory/Optional TYPE DESCRIPTION
sender M string This specify the sender name registered on the platform. For an example, it can be VTpass.
recipient M string This is the phone number(s) of your users and can be sent as a string joined by commas (,) without spaces for more than one phone number. This can be 11 digits (or more for foreign numbers). For example: 08012345678,2347012345678,233500012223
message M string This is the message content you wish to send to your users. This can be one or more of OTP, post transaction SMS, Marketing campaign SMS, Promo SMS, etc.
responsetype O string This is the type or pattern of response you are comfortable with or your platform best understands. This can be one of json, text or xml.
NOTE: By default, our API returns text as responseType

Expected Response:
TEXT RESPONSE:

TG00-MESSAGE PROCESSED:0000|2347061933309|1623425963075808467849264|SENT|MESSAGE SENT TO PROVIDER|MTNNG|NIGERIA
|999|0000-00-00 00:00:00

JSON RESPONSE:

{
"responseCode": "TG00",
"response": "MESSAGE PROCESSED",
"batchId": 5463323,
"clientBatchId": null,
"sentDate": "2021-06-11 16:36:45",
"messages": [
{
"statusCode": "0000",
"recipient": "2347061933309",
"messageId": "1623425805438752507784251",
"status": "SENT",
"description": "MESSAGE SENT TO PROVIDER",
"network": "MTNNG",
"country": "NIGERIA\r",
"deliveryCode": "999",
"deliveryDate": "0000-00-00 00:00:00",
"bulkId": "1623425805465161413"
}
]
}

XML RESPONSE:

<?xml version="1.0"?>
<root>
   <responseCode>TG00</responseCode>
   <response>MESSAGE PROCESSED</response>
   <clientId>5463326</clientId>
   <clientBatchId />
   <sentDate>2021-06-11 16:40:33</sentDate>
   <messages>
	<item>
	   <statusCode>0000</statusCode>
	   <recipient>2347061933309</recipient>
	   <messageId>1623426033925937673946634</messageId>
	   <status>SENT</status>
	   <description>MESSAGE SENT TO PROVIDER</description>
	   <network>MTNNG</network>
	   <country>NIGERIA</country>
	   <deliveryCode>999</deliveryCode>
	   <deliveryDate>0000-00-00 00:00:00</deliveryDate>
	   <bulkId>1623426033496476560</bulkId>
	</item>
   </messages>
</root>

Send SMS (DND Fallback) V2
Using a GET method, you can send notification SMS to your customers using the normal route and to those whose phone numbers are placed on the Do-Not-Disturb (DND) mode as a fallback on VTpass Messaging using the API end point below:

Live URL: https://messaging.vtpass.com/v2/api/sms/dnd-fallback

NOTE: This route attracts a higher rate (most likely twice as much as the normal route) per SMS page sent

Authentication

Make sure to pass your Public Key and Secret Key as Authentication in the header to access the API

header: {
X-Token: VT_PK_XXXXXXXXXXXXXXXXXXXXXXX
X-Secret: VT_SK_XXXXXXXXXXXXXXXXXXXXXX
}

Request Pattern:
This endpoint allows you to send sms messages to your users on VTpass Messaging, you may hit this endpoint while passing your keys via the header as shown above: Request body type should be Content-Type: application/x-www-form-urlencoded.

POST URL: https://messaging.vtpass.com/v2/api/sms/dnd-fallback

FIELDS Mandatory/Optional TYPE DESCRIPTION
sender M string This is the name your users will see on their mobile phone as the sender of this SMS. For an example, it can be VTpass.
recipient M string This is the phone number(s) of your users and can be sent as a string joined by commas (,) without spaces for more than one phone number. This can be 11 digits (or more for foreign numbers). For example: 08012345678,2347012345678,233500012223
message M string This is the message content you wish to send to your users. This can be one or more of OTP, post transaction SMS, Marketing campaign SMS, Promo SMS, etc.
responsetype O string This is the type or pattern of response you are comfortable with or your platform best understands. This can be one of json, text or xml.
NOTE: By default, our API returns text as responseType

Expected Response:
TEXT RESPONSE:

TG00-MESSAGE PROCESSED:0000|2347061933309|1623425963075808467849264|SENT|MESSAGE SENT TO PROVIDER|MTNNG|NIGERIA
|999|0000-00-00 00:00:00

JSON RESPONSE:

{
"responseCode": "TG00",
"response": "MESSAGE PROCESSED",
"batchId": 5463323,
"clientBatchId": null,
"sentDate": "2021-06-11 16:36:45",
"messages": [
{
"statusCode": "0000",
"recipient": "2347061933309",
"messageId": "1623425805438752507784251",
"status": "SENT",
"description": "MESSAGE SENT TO PROVIDER",
"network": "MTNNG",
"country": "NIGERIA\r",
"deliveryCode": "999",
"deliveryDate": "0000-00-00 00:00:00",
"bulkId": "1623425805465161413"
}
]
}

XML RESPONSE:

<?xml version="1.0"?>
<root>
   <responseCode>TG00</responseCode>
   <response>MESSAGE PROCESSED</response>
   <clientId>5463326</clientId>
   <clientBatchId />
   <sentDate>2021-06-11 16:40:33</sentDate>
   <messages>
	<item>
	   <statusCode>0000</statusCode>
	   <recipient>2347061933309</recipient>
	   <messageId>1623426033925937673946634</messageId>
	   <status>SENT</status>
	   <description>MESSAGE SENT TO PROVIDER</description>
	   <network>MTNNG</network>
	   <country>NIGERIA</country>
	   <deliveryCode>999</deliveryCode>
	   <deliveryDate>0000-00-00 00:00:00</deliveryDate>
	   <bulkId>1623426033496476560</bulkId>
	</item>
   </messages>
</root>

Response Codes
This section contains the response codes you will likely get from the VTpass Messaging API.

For Instance:

When a message is successfully accepted/processed by our system, the following response will be returned

TG00-MESSAGE PROCESSED:0000|2348012345678|9967534522177818556581618|SENT|MESSAGE SENT TO PROVIDER,3333|234803456789|6667534522177818556581618|DND_REJECTED|DND_REJECTED_NUMBER

Any other status apart from TG00 means the message is rejected and will not be processed.

Response Code Meaning Note
TG00 MESSAGE PROCESSED
TG11 Invalid Authentication Credentials
TG12 Empty Username
TG13 Empty Password
TG14 Empty Recipients
TG15 Empty Message
TG16 Empty SenderID
TG17 Not Enough Units Balance
TG18 Blocked Words Found Sender ID
TG19 Blocked Words Found in Message Body
TG20 Recipients above the maximum target

BATCH CODE-BATCH DESCRIPTION:STATUSCODE|Recepient|MessageID|Message status|Status description,STATUSCODE|Recepient|MessageID|Message status|Status description

Each number sent will have its own message code, message id, message status and message description

Message Code Message status Message Description
0000 SENT MESSAGE SENT TO PROVIDER
1111 DELIVERED MESSAGE DELIVERED TO HANDSET
2222 REJECTED MESSAGE REJECTED
0014 DND_SENT MESSAGE THROUGH COOPERATE
3333 DND_REJECTED DND_REJECTED_NUMBER

SMS Unit Balance
Using a GET method, your VTpass Messaging SMS unit balance can be retrieved using the end point below:

Live URL: https://messaging.vtpass.com/api/sms/balance

Authentication

Make sure to pass your Public Key and Secret Key as Authentication in the header to access the API

header: {
X-Token: VT_PK_XXXXXXXXXXXXXXXXXXXXXXX
X-Secret: VT_SK_XXXXXXXXXXXXXXXXXXXXXX
}

Request Pattern:
To fetch your unit balance on VTpass Messaging, you may hit the balance endpoint while passing your keys via the header as shown above:

URL: https://messaging.vtpass.com/api/sms/balance

FIELDS Mandatory/Optional TYPE DESCRIPTION
N/A N/A N/A N/A

Expected Response:

256.21
