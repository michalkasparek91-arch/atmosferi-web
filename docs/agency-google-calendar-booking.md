# Atmosferi° agency intro: Google Calendar booking

The public booking URL is configured at `assets/agency-booking-config.js`:
`window.ATMOSFERI_AGENCY_APPOINTMENT_URL = "";`

## Configure the Google appointment page

1. Open [Google Calendar](https://calendar.google.com/) on a desktop and choose **Create → Appointment schedule** (Czech UI: **Vytvořit → Rozpis schůzek**).
2. Suggested public title: **Atmosferi° | 15-minute agency intro**. Set duration to **15 minutes**, time zone **Europe/Prague**, and choose realistic workday availability.
3. Under **Check calendars for availability**, include the calendar(s) used for actual commitments. Set a reasonable minimum notice and buffer if your plan supports it.
4. Under **Location and conferencing**, choose **Google Meet video conferencing**. The booking page handles confirmation, guest invitations and Google Meet links.
5. Save. In the **Booking pages / Rezervační stránky** section, copy the link for this specific booking page.
6. Copy the public URL (typically `https://calendar.app.google/...`) into the config string above, then commit. Do not use a private calendar share link or a one-off Meet URL.
7. Test opening the CTA on `/for-agencies?lang=cs`, `?lang=en`, `?lang=de` and `?lang=fr`. Verify that Google shows slots, then complete one test booking and cancel it.
8. Check the booking page's public profile name/photo before publishing. Google displays account identity to bookers.

When the URL is unset or not recognized as a real Google Calendar appointment page, the CTA keeps its existing no-brief email request fallback. The website never claims that an appointment was booked without Google confirmation. A secondary message link remains available after scheduling is enabled.

Official Google documentation:
- https://support.google.com/calendar/answer/10729749?hl=cs
- https://support.google.com/calendar/answer/10733297?hl=cs
