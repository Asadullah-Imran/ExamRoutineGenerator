let courseCount = 0;
// const API_BASE_URL = "https://exgen-six.vercel.app";
const API_BASE_URL = "http://127.0.0.1:8000";

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

    <button class="remove-btn" onclick="removeCourseSection(${courseCount})">Remove</button>
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

    try {
      const response = await fetch(`${API_BASE_URL}/generate-routine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: studentId,
          department,
          course,
          section,
        }),
      });

      const result = await response.json();
      if (result.success) {
        allResults.push(result.routine);
      } else {
        allResults.push({ error: result.detail || "Failed to fetch routine" });
      }
    } catch (error) {
      allResults.push({ error: "An error occurred. Please try again." });
    }
  }

  // Display Results
  allResults.forEach((result, index) => {
    if (result.error) {
      routineContainer.innerHTML += `<p><strong>Course ${index + 1}:</strong> ${
        result.error
      }</p>`;
    } else {
      const courseTitle = result[0]["Course Title"];
      let tableHTML = `
        <h4>Routine for ${courseTitle}</h4>
        <table>
          <thead>
            <tr>
              <th>Exam Date</th>
              <th>Exam Time</th>
              <th>Room</th>
            </tr>
          </thead>
          <tbody>
      `;
      result.forEach((item) => {
        tableHTML += `
          <tr>
            <td>${item["Exam Date"]}</td>
            <td>${item["Exam Time"]}</td>
            <td>${item.Room}</td>
          </tr>
        `;
      });
      tableHTML += `</tbody></table>`;
      routineContainer.innerHTML += tableHTML;
    }
  });

  if (routineContainer.innerHTML.trim()) {
    downloadBtn.style.display = "block"; // Show the PDF button
  }

  routineContainer.style.display = "block";
}

// Update the department selection
document.getElementById("department").addEventListener("change", (e) => {
  const department = e.target.value;
  loadCourseData(department); // Load courses when department is selected
});
