CLAUDE ANALYSIS OF OUR MOBILE APP AUTH, REGISTRATION, KYC, WELCOME

SCREEN COMPARED TO THE NEW DESIGNS.

I want to change this current codebase to another brands own. I was building this for raverpay but now another client want to build this exact same thing so I want to refactor things.

First understand our codebase very well before deciding on any thing.

Phase 1 would be to change the name from raverpay to ingantapay. also change raverpay-api to just api, raverpay-admin to admin, raverpay-mobile to mobile. This also includes the email templates.

I will require you to create phases of what we would need to change and the first one is the changing of name.

I have taken my time to talk to an Ai which read some part of our raverpay mobile app codebase. I.e Auth, tabs, Home Screen, Profile inside of apps folder in mobile app alone then i gave the ai the new images of the new inganta to analyse and decide what is in the designs and what needs to be changed in our current codebase or added or removed.

So check this all the analysis of the mobile app in /Users/joseph/Desktop/raverpay/IngantaPay/Implementation.md

You should note that the analysis might not be accurate or it might be missing some things. If this Md says we should do something then we need to first decide if this is our current codebase pattern. E.g it asks us to use a new color of red, we have a centralized place where we keep our colors so that when we change it once, everything is changed across the app. If it ask us to use a particular font, we have to make it reusable for all text or just certain text. All across the AI suggestions, it ask us to change something’s or it asks us to change the header of the mobile app, remember we have a centralized or reusable components we use for the header so that is the only place we need to change. if it ask us to change a button color or texttinput or text or icon or something else, we should just adjust the current reusable components we have for that.

It also tells us to add new api endpoints or database Schema or adjust current ones. We need to first check We currently use a prisma workaround md to add tables to our database and also how our current nest js codebase is so follow that pattern and add whatever new tables, adjustments we need to make and all of that.

It even tells us in some places to that All text should be white but we have to respect our current reusable text or input components and dark mode light mode and just change the colors in this components if it needs changing.

Make sure to focus on only mobile app and backend now as the first sets of phases you will create as the first tasks. Infact after phase 1 of changing the codebase names etc. the phase 2 should first be the splash screen, onboarding , welcome screen and also the authentication in our mobile app and adjustment to what relates to that on the backend. .i.e Auth, users etc

We can then focus on phase 3 which will be the changes in the mobile app Home Screen.

For other screens in our codebase that the ai is yet to analyze, phases like add money, transfer, circle, crypto etc. I will provide you the new inganta pay mobile app images for you to analyze later, then you will now check our codebase to understand what we current have and what the inganta pay design want us to do and also for you to provide the changes we have to make to the mobile app, backend and admin dashboard.

When you now Analyse the new inganta images I told you about and cross reference it with our current codebase then you can now start forming the other phases starting from 6, 7 and so on. For now only create just the phases based on the AI analysis and suggestions of our mobile app codebase markdown docs I placed inside of /Users/joseph/Desktop/raverpay/IngantaPay/Implementation.md

If any of the Ai analysis says we should remove any items or logic. It’s best to just comment it out and label it old raverpay code or something. you decide what is best.

So for now just create a plan for each phases and keep them in a folder like

Ingantapay folder

Phase 1

Overview
Tasks/Plan (which will include what to change in mobile app, backend or admin dashboard)
Progress

Or if you think this is not a proper way file we can use, suggest a proper way and make it that way.

The main point is that we can give different Claude code agent or a different ai to take on each different tasks independently and they will do it excellently.

Also create a phase docs of a migration plan away from what we have currently in our backend or something based on infrastructure and tools we are using.

You can check our backend env to see what we are currently using with database, emails, sms, etc Client wants to use AWS for backend instead of the supabase we are using as database, also we are using railway. So just create the phase for that and what are the standard tool we will need to replace with that or even suggest the one we have to keep like VTPass for airtime, data, etc

I think I will just suggest that for each phases, we list what we currently have like in a table and also on another table what the AI observations ask us to implement so before we remove anything we can decide.

Apart from phases, after understanding our codebase and how we do things. You will create a rules somewhere individually for our mobile app and backend so incase I want to give another AI agent to work on the codebase, it can accurately check the rules and not do things outside the box or how things are done in our codebase

You must make sure to ask me if you want to remove anything from our codebase so i can provide you the answers when you are in the process of creating the phases for the removal of old codebase
