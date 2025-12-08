Mobile

NOTE: I may be wron/right in things I suggest but make sure to correct me or acknowledge of correct.

I want to start building the mobile app inside of raverpay/raverpay-mobile based on the fact that the raverpay/raverpay-api is ready to some extent. You can check and see everything we can do there.

Before you write any code, I want this app to be a production world standard fintech app. So provide a mobileapp.md first on what the screens will be and also how the flow for the app will be like based on our readily available API.

Also a guided tour of how the users will from registration to them taken to the enter otp code screen and later taken to the home screen so maybe we need to update our nestJs codebase to make sure that once a user signs up, the still need to verify their email first before they can login so maybe we need to update your database table.

For the mobile app, i want you to suggests as many ways, patterns, methods and packages that we have to use to make this top notch.

We should also suggest which colours works best for fintech so we have to choose one.

These are the packages I’ve used before that I think are google

typescript tanstack react query v5 zustand nativewind v5 tailwindcss expo router reanimated v5 base64-arraybuffer react-native-toast-message zod @expo-google-fonts/urbanist @expo/vector-icons

The one I have top of my head are the following.

1. We must create our own UI components and make them reusable. Components like text input, modals, buttons, different tech and their sizes,

2. The app colours must be defined and must also accommodate dark and light mode

3. The app should also accommodate resizes of different phone sizes. I know that for the web we can use media queries or Tailwind CSS but also suggest what we have to use for mobile.
4. Push notifications using one signal,
5. Predefined font. We can use urbanist for now using
6. I want the app to open fast so if a user login, and they close the app, coming back into thr app, it should just open directly unless access token has expired so error of session expired will show so they need to login back again.
7. Even information about their name, wallet balance and things we need to show on the UI should be on the screen already when are inside thr app the second time, so we probably need to save their information locally on keychain or sqllite or something or what do you suggest?.
8. If information stored locally are displayed then we should also do a background update on these information if those info changed already or what do you suggest??
9. Ability to login via face ID, or store their emails locally after the first successful login so next time they need to login they only need to enter their password.
10. Store sensitive information, access token or refresh token in keychain or what do you suggest?
11. Use expo vector icons for icons across our app.
12. Make the app look more iOS so people think it is a Native Ios app built with swiftui even though we used react native or what do you suggest??
13. Ability to change specific information in a user’s profile and lock whatever they can.
14. There should be a notification screen as well with 3 things. Transactions, services and activities so we probably need to update our nest Js code and add a new table to store the notifications for each users and we can send them periodically or queue them.
15.

After that, we will build the admin web too so check our API and see what we can use so far. We still need to build the admin APIs as I think that is not there yet.
