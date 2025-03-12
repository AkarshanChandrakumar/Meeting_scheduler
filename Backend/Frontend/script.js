
document.getElementById("meetingForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const meetingTitle = document.getElementById("meeting_title").value.trim();
    const description = document.getElementById("description").value.trim();
    const startDateTime = document.getElementById("date_time").value;
    const endDateTime = document.getElementById("end_time").value;
    const selectedGroup = document.getElementById("group").value;
    const meetingLink = document.getElementById("links").value.trim();

    // Predefined Groups and their Emails
    const groups = {
        "Team1": ["chanrakumar019@gmail.com","snehaelango04@gmail.com"],
        "Team2": ["chanrakumar019@gmail.com","snehaelango04@gmail.com"],
        "Team3": ["supreet2982002@gmail.com","prakash.kopf14@gmail.com"]
    };

    if (!selectedGroup) {
        alert("Please select a group.");
        return;
    }

    const emails = groups[selectedGroup];

    if (!startDateTime || !endDateTime) {
        alert("Please select both start and end date/time.");
        return;
    }

    const payload = {
        meetingTitle,
        description,
        startTime: new Date(startDateTime).toISOString(),
        endTime: new Date(endDateTime).toISOString(),
        mails: emails,
        meetingLink: meetingLink || null
    };

    console.log("Payload:", payload);

    try {
        const response = await fetch("http://localhost:8000/schedule_event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (response.ok) {
            alert(`Meeting Scheduled!`);
        } else {
            alert(`Error: ${result.msg || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Request failed", error);
        alert("Failed to schedule the meeting");
    }
});
