document.getElementById("meetingForm").addEventListener("submit", async function(event) {
  event.preventDefault();

  const meetingData = {
      meeting_title: document.getElementById("meeting_title").value,
      date_time: document.getElementById("date_time").value,
      emails: document.getElementById("emails").value,
      links: document.getElementById("links").value,  // Added this field
  };

  try {
      const response = await fetch("/schedule-meeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(meetingData),
      });

      const result = await response.json();
      alert(result.message);  // Display response message as an alert
  } catch (error) {
      console.error("Error scheduling meeting:", error);
      alert("Failed to schedule the meeting. Please try again.");
  }
});
