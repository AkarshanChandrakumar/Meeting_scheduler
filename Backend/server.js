const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static("Frontend"));

// Google OAuth2 Authentication
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json", // Your service account JSON file
  scopes: [
    "https://www.googleapis.com/auth/calendar.events", // For Google Meet
    "https://www.googleapis.com/auth/chat.messages", // For Google Chat
  ],
});

const calendar = google.calendar({ version: "v3", auth });
const chat = google.chat({ version: "v1", auth });

// 🛠 POST API to schedule a meeting and send to Google Chat
app.post("/schedule-meeting", async (req, res) => {
  const { meeting_title, date_time, emails, spaceId } = req.body;

  if (!meeting_title || !date_time || !emails || !spaceId) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    // Create Google Meet Event
    const event = {
      summary: meeting_title,
      start: { dateTime: date_time, timeZone: "Asia/Kolkata" },
      end: { dateTime: new Date(new Date(date_time).getTime() + 30 * 60000).toISOString(), timeZone: "Asia/Kolkata" }, // 30 min duration
      attendees: emails.split(",").map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
    });

    const meetingLink = response.data.hangoutLink; // ✅ Google Meet Link

    console.log("Google Meet created:", meetingLink);

    // Send Google Meet Link to Google Chat
    const messageText = `📅 *Meeting Scheduled*\n\n*Title:* ${meeting_title}\n*Date/Time:* ${date_time}\n*Google Meet:* ${meetingLink}\n*Participants:* ${emails}`;

    await chat.spaces.messages.create({
      parent: spaceId,
      requestBody: { text: messageText },
    });

    console.log("Message sent to Google Chat successfully!");

    res.status(200).json({ message: "Meeting scheduled and sent to Google Chat!", meetingLink });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Meeting saved, but Google Chat message failed.", error: error.message });
  }
});

// Serve Frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Frontend", "index.html"));
});

// Start Server
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
