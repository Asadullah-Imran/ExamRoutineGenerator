let courseCount = 0;

let courseData = {}; // This will hold the course data for each department

// Fetch course data only once when a department is selected
async function loadCourseData(program) {
  try {
    let response;
    if (program === "sose" && !courseData.sose) {
      response = await fetch("sose_all_course_titles.json");
      courseData.sose = await response.json();
    } else if (program === "sobe" && !courseData.sobe) {
      response = await fetch("sobe_all_course_titles.json");
      courseData.sobe = await response.json();
    }
  } catch (error) {
    console.error("Error loading course data:", error);
  }
}

// Fetch course suggestions based on the department and query
async function fetchCourseSuggestions(program, query) {
  // Use the course data already loaded for the department
  if (!courseData[program]) {
    return []; // No course data available if the department wasn't selected yet
  }

  const courses = courseData[program];

  // Normalize query to lowercase for case-insensitive matching
  const lowerQuery = query.toLowerCase();

  // Filter courses based on the query
  return courses.filter((course) => {
    const lowerCourse = course.toLowerCase();
    return (
      lowerCourse.includes(lowerQuery) || // Match any part of the course name
      getInitials(course).startsWith(lowerQuery) // Match based on initials
    );
  });
}

// Helper function to generate initials from a course name
function getInitials(courseName) {
  return courseName
    .split(/\s+/) // Split by spaces
    .map((word) => word[0]?.toLowerCase()) // Take the first letter of each word
    .join(""); // Join them together
}

function setupAutocomplete(inputField, programField) {
  const suggestionBox = document.createElement("div");
  suggestionBox.className = "suggestion-box";
  inputField.parentNode.insertBefore(suggestionBox, inputField.nextSibling);

  inputField.addEventListener("input", async () => {
    const query = inputField.value;
    const program = programField.value; // Get the selected department
    if (!program) {
      console.error("Program is not selected.");
      suggestionBox.innerHTML = "";
      suggestionBox.style.display = "none";
      return;
    }

    if (query.length < 1) {
      suggestionBox.innerHTML = "";
      suggestionBox.style.display = "none";
      return;
    }

    const suggestions = await fetchCourseSuggestions(program, query);

    suggestionBox.innerHTML = suggestions
      .map((suggestion) => `<div class="suggestion-item">${suggestion}</div>`)
      .join("");
    suggestionBox.style.display = suggestions.length > 0 ? "block" : "none";

    suggestionBox.querySelectorAll(".suggestion-item").forEach((item) => {
      item.addEventListener("click", () => {
        inputField.value = item.textContent;
        suggestionBox.innerHTML = "";
        suggestionBox.style.display = "none";
      });
    });
  });

  // Hide suggestions on blur
  inputField.addEventListener("blur", () => {
    setTimeout(() => {
      suggestionBox.innerHTML = "";
      suggestionBox.style.display = "none";
    }, 200); // Delay to allow click events on suggestions
  });
}

// Add a new course and section input
function addCourseSection() {
  const formContainer = document.getElementById("form-container");
  const formSet = document.createElement("div");
  formSet.className = "form-group";
  formSet.id = `course-set-${courseCount}`;
  formSet.innerHTML = `
    <label for="course-${courseCount}">Course Name</label>
    <input type="text" id="course-${courseCount}" placeholder="Enter course name" />

    <label for="section-${courseCount}">Section</label>
    <input type="text" id="section-${courseCount}" placeholder="Enter section" />

    <button class="remove-btn" onclick="removeCourseSection(${courseCount})"><i class="fas fa-trash"></i> Remove</button>
  `;
  formContainer.appendChild(formSet);
  const courseInput = document.getElementById(`course-${courseCount}`);
  const programField = document.getElementById("program"); // Reference the department dropdown
  setupAutocomplete(courseInput, programField);

  courseCount++;
}

// Remove a course and section input
function removeCourseSection(id) {
  const formSet = document.getElementById(`course-set-${id}`);
  if (formSet) {
    formSet.remove();
  }
}

// Function to download the routine as an image or PDF
function downloadRoutine(format = "pdf") {
  const routineContainer = document.getElementById("routine");

  if (!routineContainer || !routineContainer.innerHTML.trim()) {
    alert("No routine data available to download.");
    return;
  }

  // Use html2canvas to capture the routine container
  html2canvas(routineContainer).then((canvas) => {
    if (format === "png") {
      // Save as PNG
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "routine.png";
      link.click();
    } else if (format === "pdf") {
      // Save as PDF
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();

      const imgData = canvas.toDataURL("image/png");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const scaleFactor = Math.min(
        pageWidth / imgWidth,
        pageHeight / imgHeight
      );
      const imgScaledWidth = imgWidth * scaleFactor;
      const imgScaledHeight = imgHeight * scaleFactor;

      pdf.addImage(
        imgData,
        "PNG",
        (pageWidth - imgScaledWidth) / 2, // Center horizontally
        (pageHeight - imgScaledHeight) / 2, // Center vertically
        imgScaledWidth,
        imgScaledHeight
      );

      pdf.save("routine.pdf");
    }
  });
}

// Generate routines for all courses
async function generateRoutine() {
  console.log("Generating routine...");
  const studentId = document.getElementById("studentId").value;
  const program = document.getElementById("program").value;
  const formContainer = document.getElementById("form-container");
  const formSets = formContainer.querySelectorAll(".form-group");
  const routineContainer = document.getElementById("routine");
  const errorContainer = document.getElementById("error");
  const downloadBtn = document.getElementById("download-buttons");

  // Clear previous results
  routineContainer.style.display = "none";
  routineContainer.innerHTML = "";
  errorContainer.style.display = "none";
  downloadBtn.style.display = "none";

  function displayError(message) {
    const errorContainer = document.getElementById("error");
    errorContainer.textContent = message;
    errorContainer.style.display = "block";
  }

  if (!studentId || !program) {
    errorContainer.textContent = "Please enter your Student ID and program.";
    errorContainer.style.display = "block";
    return;
  }

  if (formSets.length === 0) {
    errorContainer.textContent = "Please add at least one course.";
    errorContainer.style.display = "block";
    return;
  }
  const studentPrefix = studentId.substring(0, 3); // Extract first 3 digits of student ID

  const allResults = [];
  for (const formSet of formSets) {
    const course = formSet.querySelector(
      "input[placeholder='Enter course name']"
    ).value;
    const section = formSet.querySelector(
      "input[placeholder='Enter section']"
    ).value;

    if (!course || !section) {
      errorContainer.textContent = "Please fill all fields for each course.";
      errorContainer.style.display = "block";
      return;
    }

    //try part
    try {
      // Fetch the JSON data
      let response;
      if (program === "sose") {
        response = await fetch("sose_output_file.json");
      } else if (program === "sobe") {
        response = await fetch("sobe_output_file.json");
      }
      const jsonData = await response.json();

      // Filter data based on department, course, and section
      const filteredData = jsonData.filter((item) => {
        const courseParts = item["Course Title"].toLowerCase().split("/"); // Split by "/"

        // Ensure student gets courses from the correct department
        if (studentPrefix === "021" && item["Dept."] !== "BSEEE") {
          return false; // Skip if student is from BSEEE but course is not in BSEEE
        } else if (studentPrefix !== "021" && item["Dept."] == "BSEEE") {
          return false; // Skip if student is from BSCSE but course is not in BSCSE
        }

        return (
          courseParts.some(
            (part) => part.trim() === course.toLowerCase().trim()
          ) && item["Section"].toLowerCase() === section.toLowerCase()
        );
      });

      if (filteredData.length === 0) {
        allResults.push({
          error: `No routine found for course: ${course}, section: ${section}`,
        });
        displayError(
          `No routine found for course: ${course}, section: ${section}`
        );
        continue; // Move to the next formSet
      }

      // Parse room information and match the student ID
      const parseRoomInfo = (roomString, studentId) => {
        const roomPattern = /(\d+)\s*\((\d+-\d+)\)/g; // Match room and ID range
        let match;
        while ((match = roomPattern.exec(roomString)) !== null) {
          console.log(match);
          const [_, room, idRange] = match;
          const [startId, endId] = idRange.split("-").map(Number);
          if (startId <= Number(studentId) && Number(studentId) <= endId) {
            return room; // Return the room number if student ID matches
          }
        }
        // If no matching room is found, show an error on the webpage
        displayError(`No matching room found for student ID: ${studentId}`);

        return null; // No matching room found
      };
      // Function to display error messages on the website

      // Find room numbers for the given student ID
      const roomNumbers = filteredData
        .map((item) => ({
          ...item,
          Room: parseRoomInfo(item["Room"], studentId),
        }))
        .filter((item) => item.Room !== null);

      if (roomNumbers.length === 0) {
        allResults.push({
          error: `No room found for student ID: ${studentId} in course: ${course}, section: ${section}`,
        });
      } else {
        allResults.push(...roomNumbers);
      }
    } catch (error) {
      allResults.push({
        error: "An error occurred while processing the routine.",
      });
    }
  }

  // Combine results into one table
  let combinedResults = [];
  allResults.forEach((result) => {
    if (result.error) {
      routineContainer.innerHTML += `<p><strong>Course:</strong> ${result.error}</p>`;
    } else {
      combinedResults = combinedResults.concat(result);
    }
  });

  if (combinedResults.length > 0) {
    // Sort combinedResults by Exam Date and then by start time of Exam Time range
    combinedResults.sort((a, b) => {
      const dateA = new Date(a["Exam Date"]);
      const dateB = new Date(b["Exam Date"]);

      // First compare by Exam Date
      if (dateA !== dateB) {
        return dateA - dateB; // Sort by date if different
      }

      // If dates are the same, compare by start time of the Exam Time range
      const timeRangeA = a["Exam Time"];
      const timeRangeB = b["Exam Time"];

      // Extract the start time (before the "-")
      const startTimeA = timeRangeA.split(" - ")[0];
      const startTimeB = timeRangeB.split(" - ")[0];

      // Convert start time (e.g., "11:30 AM") to a Date object for comparison
      const timeAParsed = new Date(`1970-01-01T${startTimeA}:00`);
      const timeBParsed = new Date(`1970-01-01T${startTimeB}:00`);

      return timeAParsed - timeBParsed; // Sort by start time if dates are the same
    });

    // Create a single table with all results
    let tableHTML = `
         <h4>Routine for ${program.toUpperCase()} Program</h4>
         <table>
           <thead>
             <tr>
               <th>Course Title</th>
               <th>Exam Date</th>
               <th>Exam Time</th>
               <th>Room</th>
             </tr>
           </thead>
           <tbody>
       `;

    combinedResults.forEach((item) => {
      tableHTML += `
           <tr>
             <td>${item["Course Title"]}</td>
             <td>${item["Exam Date"]}</td>
             <td>${item["Exam Time"]}</td>
             <td>${item["Room"]}</td>
           </tr>
         `;
    });

    tableHTML += `</tbody></table>`;
    routineContainer.innerHTML = tableHTML;

    downloadBtn.style.display = "block"; // Show the download button

    routineContainer.style.display = "block";
  }
}

// Update the department selection
document.getElementById("program").addEventListener("change", (e) => {
  const program = e.target.value;
  loadCourseData(program); // Load courses when department is selected
});
document.addEventListener("DOMContentLoaded", () => {
  // Load course data for "sose" when the page loads
  const program = document.getElementById("program").value;
  loadCourseData(program); // Load courses when department is selected
});
