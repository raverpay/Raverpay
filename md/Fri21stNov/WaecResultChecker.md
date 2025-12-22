WAEC Result Checker API
This section contains the recommended flow for integrating WAEC result checker services on the VTpass RESTful API.

Authentication
Learn about authentication from here.

Available Endpoints
To integrate the VTpass WAEC result checker RESTful API, the endpoints below applies:

Get Variation Codes: this returns variation codes for various WAEC result checker plans
Purchase Product (Using the variation code gotten in the first step)
Query transaction status

GET VARIATION CODES
Using a GET method, the VTpass variation codes for WAEC result checker plans can be accessed with the endpoint below:

Live: https://vtpass.com/api/service-variations?serviceID=waec

Sandbox: https://sandbox.vtpass.com/api/service-variations?serviceID=waec

FIELDS Mandatory/Optional TYPE DESCRIPTION
N/A N/A N/A N/A

EXPECTED RESPONSE

{  
 "response_description":"000",
"content":{  
 "ServiceName":"WAEC Result Checker PIN",
"serviceID":"waec",
"convinience_fee":"N0.00",
"variations":[
{
"variation_code": "waecdirect",
"name": "WASSCE",
"variation_amount": "900.00",
"fixedPrice": "Yes"
},
...
]
}
}

PURCHASE PRODUCT
Using a POST method, WAEC result checker pin can with the endpoint below:

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: waec

FIELDS Mandatory/Optional TYPE DESCRIPTION
request_id M String This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID M String Service ID as specified by VTpass. In this case, it is waec
variation_code M String The code of the variation (as specified in the GET VARIATIONS method as variation_code).
amount O Number The amount of the variation (as specified in the GET VARIATIONS endpoint as variation_amount)
This amount will be ignored as the variation code determine the price of the data bundle.

quantity O Number The quantity of the result checker PIN you wish to purchase.
This quantity will be defaulted to 1 if it is not passed in your request.

phone M Number The phone number of the customer or recipient of this service

EXPECTED RESPONSE

{
"code": "000",
"content": {
"transactions": {
"status": "delivered",
"product_name": "WAEC Result Checker PIN",
"unique_element": "08011111111",
"unit_price": 900,
"quantity": 1,
"service_verification": null,
"channel": "api",
"commission": 100,
"total_amount": 800,
"discount": null,
"type": "Education",
"email": "sandbox@vtpass.com",
"phone": "07061933309",
"name": null,
"convinience_fee": 0,
"amount": 900,
"platform": "api",
"method": "api",
"transactionId": "1582290782154",
"commission_details": { "amount": 10.22, "rate": "1.50", "rate_type": "percent", "computation_type": "default" },
}
},
"response_description": "TRANSACTION SUCCESSFUL",
"requestId": "20250218124018-c3pwwi49eid",
"amount": "900.00",
"transaction_date": "2025-02-18T11:40:20.000000Z",
"purchased_code": "Serial No:WRN123456790, pin: 098765432112",
"cards": [
{
"Serial": "WRN123456790",
"Pin": "098765432112"
}
]
}

QUERY TRANSACTION STATUS
Using a POST method, transaction status can be queried with the endpoint below:

Live: https://vtpass.com/api/requery

Sandbox: https://sandbox.vtpass.com/api/requery

FIELDS Mandatory/Optional TYPE DESCRIPTION
request_id M String
This is the reference with which you sent when purchasing a transaction after the transaction has been executed.

EXPECTED RESPONSE

{
"code": "000",
"content": {
"transactions": {
"status": "delivered",
"product_name": "WAEC Result Checker PIN",
"unique_element": "08011111111",
"unit_price": 900,
"quantity": 1,
"service_verification": null,
"channel": "api",
"commission": 100,
"total_amount": 800,
"discount": null,
"type": "Education",
"email": "sandbox@vtpass.com",
"phone": "07061933309",
"name": null,
"convinience_fee": 0,
"amount": 900,
"platform": "api",
"method": "api",
"transactionId": "1582290782154",
"commission_details": { "amount": 10.22, "rate": "1.50", "rate_type": "percent", "computation_type": "default" },
}
},
"response_description": "TRANSACTION SUCCESSFUL",
"requestId": "20250218124018-c3pwwi49eid", "amount": "900.00",
"transaction_date": "2025-02-18T11:40:20.000000Z",
"purchased_code": "Serial No:WRN123456790, pin: 098765432112",
"cards": [
{
"Serial": "WRN18235587",
"Pin": "373820665250"
}
]
}
