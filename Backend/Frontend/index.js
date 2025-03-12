

import express from "express";
import cors from "cors";
import { google } from "googleapis";
import opn from "opn";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import nodemailer from "nodemailer";

dayjs.extend(utc);
dayjs.extend(timezone);
const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(cors());

const CLIENT_ID = "CLIENT ID";
const CLIENT_SECRET = "CLIENT SECRET";
const REDIRECT_URI = "http://localhost:8000/oauth2callback";
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const SCOPES = ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/gmail.send"];
const authUrl = oauth2Client.generateAuthUrl({ access_type: "offline", scope: SCOPES });

const calendar = google.calendar({ version: "v3", auth: oauth2Client });
const gmail = google.gmail({ version: "v1", auth: oauth2Client });

app.get("/", (req, res) => {
    res.send(`<a href="${authUrl}">Authorize with Google</a>`);
});

app.get("/oauth2callback", async (req, res) => {
    const { code } = req.query;
    if (code) {
        try {
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            console.log("Tokens acquired and set:", tokens);
            res.send("Authorization successful! You can close this window.");
        } catch (error) {
            res.send("Error during authorization");
            console.error(error);
        }
    } else {
        res.send("No code received");
    }
});

async function ensureValidToken() {
    if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
        throw new Error("No valid access token available. Please reauthorize.");
    }
    try {
        await oauth2Client.getAccessToken();
    } catch (error) {
        console.error("Error refreshing access token:", error);
        throw error;
    }
}

app.post("/schedule_event", async (req, res) => {
    const { mails, startTime, endTime, meetingTitle, description } = req.body;

    if (!mails || !startTime || !endTime || !meetingTitle || !description) {
        return res.status(400).json({ msg: "Missing required fields." });
    }

    try {
        await ensureValidToken();
        const eventResponse = await calendar.events.insert({
            calendarId: "primary",
            auth: oauth2Client,
            requestBody: {
                summary: meetingTitle,
                description: description,
                start: {
                    dateTime: dayjs(startTime).tz("Asia/Kolkata").format(),
                    timeZone: "Asia/Kolkata",
                },
                end: {
                    dateTime: dayjs(endTime).tz("Asia/Kolkata").format(),
                    timeZone: "Asia/Kolkata",
                },
                attendees: mails.map((email) => ({ email })),
                recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=1420"],
                conferenceData: {
                    createRequest: {
                        requestId: `request-${Date.now()}`,
                        conferenceSolutionKey: {
                            type: "hangoutsMeet",
                        },
                    },
                },
            },
            conferenceDataVersion: 1,
        });

        const meetingLink = eventResponse.data.conferenceData.entryPoints[0].uri;
        await sendEmailNotification(mails, meetingTitle, description, startTime, endTime, meetingLink);
        res.json({
            msg: "Event scheduled successfully.",
            event: eventResponse.data,
            meetLink: meetingLink,
        });
    } catch (error) {
        console.error("Error scheduling event:", error);
        res.status(500).json({ msg: "Failed to schedule the event." });
    }
});

async function sendEmailNotification(recipients, title, description, startTime, endTime, link) {
    const emailBody = `
        Invitation: ${title} @ Weekly from ${dayjs(startTime).format("h:mm A")} to ${dayjs(endTime).format("h:mm A")} on weekdays 1420 times (IST)
        
        You have been invited to a meeting.
        
        Title: ${title}
        Description: ${description}
        Start Time: ${startTime}
        End Time: ${endTime}
        Meeting Link: ${link}
    `;
    
    const encodedMessage = Buffer.from(
        `From: me\nTo: ${recipients.join(",\nTo: ")}\nSubject: Invitation: ${title}\n\n${emailBody}`
    ).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    
    try {
        await ensureValidToken();
        await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: encodedMessage,
            },
        });
        console.log("Email notification sent successfully");
    } catch (error) {
        console.error("Error sending email notification:", error);
    }
}

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
    opn(authUrl);
});
