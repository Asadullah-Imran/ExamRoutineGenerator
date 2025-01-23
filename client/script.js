let courseCount = 0;
const API_BASE_URL = "https://exgen-six.vercel.app";
// const API_BASE_URL = "http://127.0.0.1:8000";

let courseData = {}; // This will hold the course data for each department

// Fetch course data only once when a department is selected
async function loadCourseData(department) {
  try {
    let response;
    if (department === "BSCSE" && !courseData.BSCSE) {
      response = await fetch("bscse_course_titles.json");
      courseData.BSCSE = await response.json();
    } else if (department === "BSEEE" && !courseData.BSEEE) {
      response = await fetch("bseee_course_titles.json");
      courseData.BSEEE = await response.json();
    } else if (department === "BSDS" && !courseData.BSDS) {
      response = await fetch("bsds_course_titles.json");
      courseData.BSDS = await response.json();
    } else if (department === "ALL" && !courseData.ALL) {
      response = await fetch("all_course_titles.json");
      courseData.ALL = await response.json();
    }
  } catch (error) {
    console.error("Error loading course data:", error);
  }
}

// Fetch course suggestions based on the department and query
async function fetchCourseSuggestions(department, query) {
  // Use the course data already loaded for the department
  if (!courseData[department]) {
    return []; // No course data available if the department wasn't selected yet
  }

  const courses = courseData[department];

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

function setupAutocomplete(inputField, departmentField) {
  const suggestionBox = document.createElement("div");
  suggestionBox.className = "suggestion-box";
  inputField.parentNode.insertBefore(suggestionBox, inputField.nextSibling);

  inputField.addEventListener("input", async () => {
    const query = inputField.value;
    const department = departmentField.value; // Get the selected department
    if (!department) {
      console.error("Department is not selected.");
      suggestionBox.innerHTML = "";
      suggestionBox.style.display = "none";
      return;
    }

    if (query.length < 1) {
      suggestionBox.innerHTML = "";
      suggestionBox.style.display = "none";
      return;
    }

    const suggestions = await fetchCourseSuggestions(department, query);

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
  const departmentField = document.getElementById("department"); // Reference the department dropdown
  setupAutocomplete(courseInput, departmentField);

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
  const department = document.getElementById("department").value;
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

  if (!studentId || !department) {
    errorContainer.textContent = "Please enter your Student ID and Department.";
    errorContainer.style.display = "block";
    return;
  }

  if (formSets.length === 0) {
    errorContainer.textContent = "Please add at least one course.";
    errorContainer.style.display = "block";
    return;
  }

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
      const response = await fetch("output_file.json");
      const jsonData = await response.json();

      // Filter data based on department, course, and section
      const filteredData = jsonData.filter(
        (item) =>
          item["Dept."] === department &&
          item["Course Title"].toLowerCase().includes(course.toLowerCase()) &&
          item["Section"].toLowerCase() === section.toLowerCase()
      );

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
         <h4>Routine</h4>
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
document.getElementById("department").addEventListener("change", (e) => {
  const department = e.target.value;
  loadCourseData(department); // Load courses when department is selected
});
