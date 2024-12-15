let courseCount = 0;

async function fetchCourseSuggestions(query) {
  try {
    const response = await fetch(
      `http://127.0.0.1:8000/course-suggestions?query=${query}`
    );
    const result = await response.json();
    return result.suggestions || [];
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
}

function setupAutocomplete(inputField) {
  const suggestionBox = document.createElement("div");
  suggestionBox.className = "suggestion-box";
  inputField.parentNode.insertBefore(suggestionBox, inputField.nextSibling);

  inputField.addEventListener("input", async () => {
    const query = inputField.value;
    if (query.length < 1) {
      suggestionBox.innerHTML = "";
      suggestionBox.style.display = "none";
      return;
    }

    const suggestions = await fetchCourseSuggestions(query);

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
  setupAutocomplete(courseInput);
  courseCount++;
}

// Remove a course and section input
function removeCourseSection(id) {
  const formSet = document.getElementById(`course-set-${id}`);
  if (formSet) {
    formSet.remove();
  }
}

// Generate routines for all courses
async function generateRoutine() {
  const studentId = document.getElementById("studentId").value;
  const department = document.getElementById("department").value;
  const formContainer = document.getElementById("form-container");
  const formSets = formContainer.querySelectorAll(".form-group");
  const routineContainer = document.getElementById("routine");
  const errorContainer = document.getElementById("error");

  // Clear previous results
  routineContainer.style.display = "none";
  routineContainer.innerHTML = "";
  errorContainer.style.display = "none";

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
      const response = await fetch("http://127.0.0.1:8000/generate-routine", {
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
      const courseTitle = result[0]["Course Title"]; // Extract course title from the response
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

  routineContainer.style.display = "block";
}
