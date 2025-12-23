# Create Your First Wallet with Social Logins

> Use API requests and Circle's sample app to create a user-controlled wallet with social logins

Learn how to initialize and create a user-controlled wallet using the social
logins. To create a wallet with email authentication, see
[Create Your First Wallet with Email](/wallets/user-controlled/create-your-first-wallet-with-email).

This quickstart uses Circle's sample application in combination with API
requests that can be sent using cURL requests or Circle's API references. cURL
requests are provided inline while API references call the API endpoints. For
more information on how to use API references to make calls, see
[Testing API References](/api-reference).

You can create both Smart Contract Accounts (SCA) and Externally Owned Accounts
(EOA) wallets. To learn more, see the [Account Type](/wallets/account-types)
guide.

## Prerequisites

Before you begin:

1. Create or sign in to your
   [Circle Developer Console](https://console.circle.com/) account.
2. [Generate an API Key](/w3s/circle-developer-account#creating-a-developer-services-api-key).
3. Complete the
   [Authentication Methods](/wallets/user-controlled/authentication-methods)
   configurations before you set up the sample app.

This guide walks you through steps on how to create a wallet and perform
transactions or signatures, and provides sample code. You can use
[Circle's sample app](http://pw-auth-example.circle.com/) on web or set it up
locally.

<Note>
  If you want to test in the iOS or Android environment, you can check our
  Github repo for [iOS sample
  app](https://github.com/circlefin/w3s-ios-sample-app-wallets) and [Android
  sample app](https://github.com/circlefin/w3s-android-sample-app-wallets).
</Note>

## Step 1. Configure sample app

1. Obtain an App ID. Either:

- From the Circle Developer Console, navigate to **Wallets > User Controlled >
  Configurator** and copy **App ID**.
- Send a `GET` request to the `/config/entity` endpoint and copy the `appId`
  from the response body.

2. Add the App ID to the sample app.

<Note>
  The sample app generates and pre-populates the device ID for you. During actual
  implementation, you must retrieve it by calling the Client-side SDK method
  [`getDeviceId`](/wallets/user-controlled/web-sdk#getdeviceid).

You should not call the `getDeviceId` method while the authentication process is
still running because the method will open an invisible modal to retrieve the
device ID, which will replace the one being used for authentication and
interrupt the ongoing authentication process. Call `getDeviceId` before calling
`performLogin` in step 4.
</Note>

<Frame>
  <img src="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp01.png?fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=570d0c6e8abda04741c53beca786cbaf" data-og-width="480" width="480" data-og-height="744" height="744" data-path="w3s/images/ucw-cyfwwsl-sampleapp01.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp01.png?w=280&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=5950bdded70f46e3d31e153c053eadaa 280w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp01.png?w=560&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=576c8cfa10fb8499cb8b3a8b972540ff 560w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp01.png?w=840&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=3038dcd78db68e08291edc11acdd38fe 840w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp01.png?w=1100&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=7b5d07f43c9056216a4c746e40aac9bd 1100w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp01.png?w=1650&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=2b01559416b5a2b4df52a16de194825d 1650w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp01.png?w=2500&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=04e21a67414da9106bd712e36601af72 2500w" />
</Frame>

<Warning>
  Only Google and Facebook login options are available for testing in the sample
  app. Apple login is not available due to a restriction on URL redirection for
  OAuth integration with Apple login through Firebase.
</Warning>

## Step 2. Obtain IDs from social providers

Obtain IDs from the following providers:

- **Google** has a dedicated Client ID for Web, iOS, and Android platforms. See
  the Google doc:
  [Get your Google API client ID](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid).
- **Facebook** has an App ID. See the Facebook doc:
  [Facebook App Development](https://developers.facebook.com/docs/development).
- **Apple** has a Bundle ID for iOS, and a Service ID for Web and Android
  platforms. See the Apple doc:
  [Register an App ID](https://developer.apple.com/help/account/manage-identifiers/register-an-app-id/).

Add the IDs to the Circle Developer Console:

1. From the sidebar, navigate to **Wallets > User Controlled > Configurator**.
2. Select **Authentication Methods > Social Logins**.
3. From **Social Logins**, enter the IDs required for your app:
   - **Google**: Client ID for Android, iOS, or Web.
   - **Apple**: Bundle ID for iOS or Service ID for Android Web.
   - **Facebook**: App ID.

You must ensure the ID settings for your app and the Circle Developer Console
always match. If you only edit or delete IDs set on the identity provider side:

- If your user is logged out, they will not be able to log back in even if their
  user token is active.
- If your user is logged in, they will remain logged in if their user token is
  active. When their user token expires in over 14 days, they will be logged out
  and will not be able to log back in.

For more, see
[Authentication Methods](/wallets/user-controlled/authentication-methods).

## Step 3. Set up social provider details

Once you have configured the social provider IDs, you must set up
`redirectedURI`, which corresponds to the `loginConfigs` within the Web SDK.

- For Google or Facebook, you must set the relevant URL domain or else redirects
  will be blocked by the provider.
- For Apple, Firebase is used for URL redirection. Firebase configuration must
  be properly set to carry out the Apple login flow. For setup instructions, see
  the Firebase doc:
  [Authenticate Using Apple](https://firebase.google.com/docs/auth/ios/apple).

<Frame>
  <img src="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle01.png?fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=7cb39d963bb7e1dc5014381e10475cee" data-og-width="512" width="512" data-og-height="406" height="406" data-path="w3s/images/ucw-cyfwwsl-socialgoogle01.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle01.png?w=280&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=c5109a02e173a8755332e9f6c8591d62 280w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle01.png?w=560&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=7648b12d1d7009c10a738160d8d8bbc1 560w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle01.png?w=840&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=82d944e5f587db47d1ee9e69b5a2544b 840w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle01.png?w=1100&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=c1a90a002e8e3c6509f69d357639e3c6 1100w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle01.png?w=1650&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=c9b5995f37643907b0262e4ad8ef5468 1650w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle01.png?w=2500&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=f07877f91d4b17794456467226e66ab1 2500w" />
</Frame>

<Frame>
  <img src="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialfb01.png?fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=412f64796fb4ba49753eee6e21cbce57" data-og-width="512" width="512" data-og-height="405" height="405" data-path="w3s/images/ucw-cyfwwsl-socialfb01.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialfb01.png?w=280&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=7e67ed3444e2e5ac37a1cb41801dd16d 280w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialfb01.png?w=560&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=3ac59232d0dcc9d81649e5332c84bdb8 560w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialfb01.png?w=840&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=a98c3171008054c1de38cc613eaad2da 840w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialfb01.png?w=1100&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=c09231a444ca33da97db1d974b50a57d 1100w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialfb01.png?w=1650&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=5616dd6657e4a89aa44b219160857bc4 1650w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialfb01.png?w=2500&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=2ef230d27c58d0e025fa2291aa51c602 2500w" />
</Frame>

<Warning>
  During the local development phase, testing redirects for Facebook can be
  conducted using localhost. Google requires an HTTPS domain for redirects.
</Warning>

## Step 4. Perform social login

1. Once the SDK setup is done, include your API key and `deviceId` in a `POST`
   request to the `/users/social/token` endpoint.

<CodeGroup>
  ```node Node.Js SDK theme={null}
  import { initiateUserControlledWalletsClient } from "@circle-fin/user-controlled-wallets";

const circleUserSdk = initiateUserControlledWalletsClient({
apiKey: "<your-api-key>",
});

const response = await circleUserSdk.createDeviceTokenForSocialLogin({
deviceId: "your device id",
});

````

```text cURL theme={null}
curl --location 'https://api.circle.com/v1/w3s/users/social/token' \
--header 'Content-Type: application/json' \
--header `Authorization: Bearer ${your api key}` \
--data '{
    "idempotencyKey": "9cd14a55-c31e-48cf-8bde-8b13767a4544",
    "deviceId": "your device id"
}'
````

</CodeGroup>

2. Copy `deviceToken` and `deviceEncryptionKey` from the response and enter them
   into the sample app.

   ```Text Response Body theme={null}
   {
     deviceToken: string
     deviceEncryptionKey: string
     otpToken?: string // For email authentication method only
   }
   ```

   <Frame>
     <img src="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp02.png?fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=4e58fe7d84859c0870c8fe988cd6ca64" data-og-width="480" width="480" data-og-height="744" height="744" data-path="w3s/images/ucw-cyfwwsl-sampleapp02.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp02.png?w=280&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=ac567bc4dc628fc772a7979c6bdbebac 280w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp02.png?w=560&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=f03595f5b8a0b262060babd69923a837 560w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp02.png?w=840&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=1893af057e7c50259e3c5fd815f74698 840w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp02.png?w=1100&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=01d127dd3db22c57633ff7ceb84d1554 1100w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp02.png?w=1650&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=e050fb7912c008a007196556492baca4 1650w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp02.png?w=2500&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=a177503f0fbff4cb4908da47538a7a0d 2500w" />
   </Frame>

3. On the sample app, select **Login with Google** or **Login with Facebook**.
   This takes you through the social login flow and corresponds to the SDK
   method `performLogin`.

   <Frame>
     <img src="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle01.png?fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=7cb39d963bb7e1dc5014381e10475cee" data-og-width="512" width="512" data-og-height="406" height="406" data-path="w3s/images/ucw-cyfwwsl-socialgoogle01.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle01.png?w=280&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=c5109a02e173a8755332e9f6c8591d62 280w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle01.png?w=560&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=7648b12d1d7009c10a738160d8d8bbc1 560w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle01.png?w=840&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=82d944e5f587db47d1ee9e69b5a2544b 840w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle01.png?w=1100&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=c1a90a002e8e3c6509f69d357639e3c6 1100w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle01.png?w=1650&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=c9b5995f37643907b0262e4ad8ef5468 1650w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle01.png?w=2500&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=f07877f91d4b17794456467226e66ab1 2500w" />
   </Frame>

   <Frame>
     <img src="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle02.png?fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=e41f4159ec3731eddbf954d7a0cf26b4" data-og-width="1112" width="1112" data-og-height="384" height="384" data-path="w3s/images/ucw-cyfwwsl-socialgoogle02.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle02.png?w=280&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=b1006a1b496355fdf9b76ea9b6ae86b1 280w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle02.png?w=560&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=0df5442578a50a5308b97f3a496757f7 560w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle02.png?w=840&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=46ad132cc204a551532fe7fe857938c4 840w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle02.png?w=1100&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=e9b1aa2b76a29dfab8119f6869c3c228 1100w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle02.png?w=1650&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=f4d78ed3fef07bda2164af1239edd7af 1650w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-socialgoogle02.png?w=2500&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=94407f79563eb72fffbc900a377997da 2500w" />
   </Frame>

   If calling `performLogin` doesn't return a response, check the following:

   - The identity provider credentials in the SDK and DevConsole are correct.
   - Confirm that the steps of the SDK initialization are complete, including
     calling `getDeviceId`.

   Consider wrapping the initialization process in a context hook instead of the
   `useEffect` hook so you can correctly capture the SDK response. Put the
   context provider in the root component of the web application:

```typescript TypeScript theme={null}
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";
import {
  EmailLoginResult,
  Error,
  SocialLoginResult,
} from "@circle-fin/w3s-pw-web-sdk/dist/src/types";

let webSdk: W3SSdk;

const Sdk = createContext<{ sdk: W3SSdk | undefined }>({
  sdk: undefined,
});

const getConfig = () => ({
  appSettings: { appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID || "" },
  loginConfigs: {
    deviceToken: localStorage.getItem("deviceToken") || "",
    deviceEncryptionKey: localStorage.getItem("deviceEncryptionKey") || "",
    otpToken: localStorage.getItem("otpToken") || "",
    facebook: {
      appId: process.env.NEXT_PUBLIC_FACEBOOK_AUTH_CLIENT_ID || "",
      redirectUri: window.location.origin,
    },
    google: {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID || "",
      redirectUri: window.location.origin,
    },
  },
});

const initializeSdk = (
  onLoginComplete: (
    error: Error | undefined,
    result: SocialLoginResult | EmailLoginResult | undefined
  ) => void
) => {
  return new W3SSdk(getConfig(), onLoginComplete);
};

export const useSdk = () => useContext(Sdk);

interface SdkProviderProps {
  children: ReactNode;
}

export const SdkProvider = ({ children }: SdkProviderProps): JSX.Element => {
  const [sdk, setSdk] = useState<W3SSdk | undefined>(webSdk);

  const onLoginComplete = useCallback(
    (
      error: Error | undefined,
      result: SocialLoginResult | EmailLoginResult | undefined
    ) => {
      if (error) {
        console.log(error);
      } else {
        console.log(result);
      }
    },
    []
  );

  useEffect(() => {
    const sdk = initializeSdk(onLoginComplete);

    if (sdk) {
      webSdk = sdk;
      setSdk(webSdk);
    }
  }, [onLoginComplete]);

  const contextValues = useMemo(() => ({ sdk }), [sdk]);
  return <Sdk.Provider value={contextValues}>{children}</Sdk.Provider>;
};
```

4. After a successful login, you are redirected back to the main page of this
   sample app. The "Execute Challenge" section is now visible.

   <Frame>
     <img src="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp03_copy_1.png?fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=6a62b50185137c32ede19bd792ed6e28" data-og-width="361" width="361" data-og-height="668" height="668" data-path="w3s/images/ucw-cyfwwsl-sampleapp03_copy_1.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp03_copy_1.png?w=280&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=32004f23b612671de5a9844af13d9652 280w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp03_copy_1.png?w=560&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=63283eaa779e9279202aed596ee0d890 560w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp03_copy_1.png?w=840&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=bcbac7902c19d3ba1329d6a5c460b485 840w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp03_copy_1.png?w=1100&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=da81a8be9e34338f8b4b38a8193d98e3 1100w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp03_copy_1.png?w=1650&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=ab1446803905fbe0948afc1414ee65ee 1650w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-sampleapp03_copy_1.png?w=2500&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=51be5916da3bd5d3614433c898f20827 2500w" />
   </Frame>

5. Select **Execute Challenge**.

   Both `encryptionKey` and `userToken` are pre-populated since these parameters
   are required for the next step, which is to initialize the user.

   <Frame>
     <img src="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-executechallenge01.png?fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=2d52dcf7deaa180be9d992afd422bef5" data-og-width="480" width="480" data-og-height="500" height="500" data-path="w3s/images/ucw-cyfwwsl-executechallenge01.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-executechallenge01.png?w=280&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=c6d033bd4702123f610b037dce4dcaf1 280w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-executechallenge01.png?w=560&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=f72c59a0a2dee6e18f4a95ef607ee9f5 560w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-executechallenge01.png?w=840&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=0d7496b6bbb70e45418ed08abec8bede 840w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-executechallenge01.png?w=1100&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=28ce0b441a99638565d0c3bb8aae1b38 1100w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-executechallenge01.png?w=1650&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=dcd179c79b4a408179aa1649e79761ca 1650w, https://mintcdn.com/circle-167b8d39/Y3M1-hPSLXlEtSe1/w3s/images/ucw-cyfwwsl-executechallenge01.png?w=2500&fit=max&auto=format&n=Y3M1-hPSLXlEtSe1&q=85&s=ddf47b6b800fd4161020ccbdfe428bf4 2500w" />
   </Frame>

<Note>
  The sample app pre-populates the `encryptionKey` and `userToken` for you.
  During the actual development, the client-side SDK returns `userId`,
  `userToken`, `encryptionKey`, `refreshToken`, and `OAuthInfo` to you.
</Note>

## Step 5. Initialize user and acquire challenge ID

1. Include `userToken` copied from the previous step in a `POST` request to the
   `/user/initialize` endpoint.
2. Copy `challengeId` from the response and enter it into the sample app.

To create an SCA wallet, provide a Testnet blockchain such as ETH-SEPOLIA,
MATIC-AMOY, and AVAX-FUJI.

### Amoy example

The following code samples show how to create an SCA wallet on Amoy and the
response.

<CodeGroup>
  ```javascript Node.js SDK theme={null}
  const response = await circleUserSdk.createUserPinWithWallets({
    userToken: "<USER_TOKEN>",
    accountType: "SCA",
    blockchains: ["MATIC-AMOY"],
  });
  ```

```coffeescript Python SDK theme={null}
# create an api instance
api_instance = user_controlled_wallets.UsersAndPinsApi(client)
try:
    request = user_controlled_wallets.SetPinAndInitWalletRequest.from_dict({"accountType": 'SCA', "blockchains": ['MATIC-AMOY'], "idempotencyKey": str(uuid.uuid4()) })
    response = api_instance.create_user_with_pin_challenge("<USER_TOKEN>", request)
    print(response)
except user_controlled_wallets.ApiException as e:
    print("Exception when calling UsersAndPinsApi->create_user_with_pin_challenge: %s\n" % e)
```

```curl cURL theme={null}
curl --request POST \
     --url 'https://api.circle.com/v1/w3s/user/initialize' \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --header 'authorization: Bearer <API_KEY>' \
     --header 'X-User-Token: <USER_TOKEN>' \
     --data '
{
"idempotencyKey": "49e3f455-60a2-4b5e-9e9e-9400b86e5f34",
"accountType": "SCA",
"blockchains": [
    "MATIC-MUMBAI"
  ]
}
'
```

</CodeGroup>

```json Response Body theme={null}
{
  "data": {
    "challengeId": "0d1b5f41-1381-50af-983b-f54691415158"
  }
}
```

### Solana example

The following code samples show how to create an EOA wallet on Solana and the
response.

<CodeGroup>
  ```javascript Node.js SDK theme={null}
  const response = await circleUserSdk.createUserPinWithWallets({
    userToken: "<USER_TOKEN>",
    accountType: "EOA",
    blockchains: ["SOL-DEVNET"],
  });
  ```

```coffeescript Python SDK theme={null}
# create an api instance
api_instance = user_controlled_wallets.UsersAndPinsApi(client)
try:
    request = user_controlled_wallets.SetPinAndInitWalletRequest.from_dict({"accountType": 'EOA', "blockchains": ['SOL-DEVNET'], "idempotencyKey": str(uuid.uuid4()) })
    response = api_instance.create_user_with_pin_challenge("<USER_TOKEN>", request)
    print(response)
except user_controlled_wallets.ApiException as e:
    print("Exception when calling UsersAndPinsApi->create_user_with_pin_challenge: %s\n" % e)
```

```curl cURL theme={null}
curl --request POST \
     --url 'https://api.circle.com/v1/w3s/user/initialize' \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --header 'authorization: Bearer <API_KEY>' \
     --header 'X-User-Token: <USER_TOKEN>' \
     --data '
{
"idempotencyKey": "a6f4c8d2-33b1-43b0-8a46-5b14efe063d8",
"accountType": "EOA",
"blockchains": [
    "SOL-DEVNET"
  ]
}
'
```

</CodeGroup>

```json Response Body theme={null}
{
  "data": {
    "challengeId": "0d1b5f41-1381-50af-983b-f54691415158"
  }
}
```

## Step 6. Create wallet

1. Paste the Challenge ID copied from the previous step into the sample app, and
   select **Execute**.
2. An “Execute Successful” message is displayed on the sample app. A web3 wallet
   is created for you users!

<Note>
  To execute a challenge during actual implementation, you must call the Web SDK
  API `execute` with the `challengeId` returned from Circle. Also, make sure you
  have an active `userToken` , `encryptionKey` for any challenge executions.
</Note>

## Step 7. Check user and wallet status

Once you have created a wallet in the sample app, you can check the user and
wallet status.

To check the user's account status:

- Include `userToken` in a `GET` request to the `/user` endpoint to retrieve the
  status of the user's account.

<CodeGroup>
  ```javascript Node.js SDK theme={null}
  const response = await circleUserSdk.getUserStatus({
    userToken: "<USER_TOKEN>",
  });
  ```

```coffeescript Python SDK theme={null}
# create an api instance
api_instance = user_controlled_wallets.UsersAndPinsApi(client)
# get user by token
try:
    response = api_instance.get_user_by_token("<USER_TOKEN>")
    print(response)
except user_controlled_wallets.ApiException as e:
    print("Exception when calling UsersAndPinsApi->get_user_by_token: %s\n" % e)
```

```curl cURL theme={null}
curl --request GET \
     --url 'https://api.circle.com/v1/w3s/user' \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --header 'authorization: Bearer <API_KEY>' \
     --header 'X-User-Token: <USER_TOKEN>'
```

</CodeGroup>

```json Response Body theme={null}
{
  "data": {
    "id": "2f1dcb5e-312a-4b15-8240-abeffc0e3463",
    "status": "ENABLED",
    "createDate": "2023-07-26T15:27:32Z",
    "pinStatus": "ENABLED",
    "pinDetails": {
      "failedAttempts": 0
    },
    "securityQuestionStatus": "ENABLED",
    "securityQuestionDetails": {
      "failedAttempts": 0
    }
  }
}
```

To check the status of the user's new wallet.

- Include `userToken` in a `GET` request to the `/wallets` endpoint to retrieve
  the user's new wallet.

<CodeGroup>
  ```javascript Node.js SDK theme={null}
  const response = await circleUserSdk.listWallets({
    userToken: "<USER_TOKEN>",
  });
  ```

```coffeescript Python SDK theme={null}
# create an api instance
api_instance = user_controlled_wallets.WalletsApi(client)
# get user token
try:
    response = api_instance.list_wallets("<USER_TOKEN>")
    print(response)
except user_controlled_wallets.ApiException as e:
    print("Exception when calling WalletsApi->list_wallets: %s\n" % e)
```

```curl Curl theme={null}
curl --request GET \
     --url 'https://api.circle.com/v1/w3s/wallets' \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --header 'authorization: Bearer <API_KEY>' \
     --header 'X-User-Token: <USER_TOKEN>'
```

</CodeGroup>

### Amoy sample response

```json Response Body theme={null}
{
  "data": {
    "wallets": [
      {
        "id": "01899cf2-d415-7052-a207-f9862157e546",
        "state": "LIVE",
        "walletSetId": "01899cf2-d407-7f89-b4d9-84d63573f138",
        "custodyType": "ENDUSER",
        "userId": "2f1dcb5e-312a-4b15-8240-abeffc0e3463",
        "address": "0x075e62c80e55d024cfd8fd4e3d1184834461db57",
        "addressIndex": 0,
        "blockchain": "MATIC-AMOY",
        "accountType": "SCA",
        "updateDate": "2023-07-28T14:41:47Z",
        "createDate": "2023-07-28T14:41:47Z"
      }
    ]
  }
}
```

### Solana sample response

```json Response Body theme={null}
{
  "data": {
    "wallets": [
      {
        "id": "8a79c80b-4d4f-4032-971a-8bb9f9b0254f",
        "state": "LIVE",
        "walletSetId": "c43221d3-9db1-4cbf-8b18-e1dcae16b55d",
        "custodyType": "ENDUSER",
        "userId": "d8c8f832-5d4f-4123-9a7f-60120c2da5f0",
        "address": "8UFfxP3zzSeqdkZ5iLTmUGzpHPRGnydZ1Vnq5GkzKTep",
        "addressIndex": 0,
        "blockchain": "SOL-DEVNET",
        "accountType": "EOA",
        "updateDate": "2023-07-28T14:43:48Z",
        "createDate": "2023-07-28T14:43:48Z"
      }
    ]
  }
}
```

You can also view the User ID, Auth Method, and Wallet status on the
[Circle Developer Console](https://console.circle.com/):

1. From the Wallets section on the sidebar, select **User Controlled > Users**.
2. Select your user from the row. The wallet address is displayed.

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://developers.circle.com/llms.txt
