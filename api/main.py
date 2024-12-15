from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd

app = FastAPI()

# Add CORS middleware¡
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (replace "*" with specific domains for better security)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Load Excel file
file_path = "./asset/mid-term-exam-schedule_notice-board_sose_243.xlsx"
data = pd.read_excel(file_path)

class RoutineRequest(BaseModel):
    department: str
    course: str
    section: str
    student_id: str

@app.get("/")
async def read_root():
    test_request = RoutineRequest(
        department="BSCSE",
        course="Probability and Statistics",
        section="A",
        student_id="011211026"
    )
    response = await generate_routine(test_request)
    return response

@app.post("/test")
async def test(request: RoutineRequest):
    print(data)
    return {"success": True, "message": "Data printed successfully"}


# Function to extract the room number for a matching student ID
def parse_room_info(room_string, student_id):
    import re
    room_pattern = r'(\d+)\s*\((\d+-\d+)\)'  # Match room and ID range
    matches = re.findall(room_pattern, str(room_string))
    
    for room, id_range in matches:
        start_id, end_id = map(int, id_range.split('-'))  # Split and convert to integers
        if start_id <= int(student_id) <= end_id:
            return room  # Return the room number if the student ID falls in the range
    
    return None  # Return None if no match is found



@app.post("/generate-routine")
async def generate_routine(request: RoutineRequest):
    try:
        # Filter data based on department, course, and section
        filtered_data = data[
            (data['Dept.'] == request.department) &
            (data['Course Title'].str.contains(request.course, case=False)) &
            (data['Section'] == request.section)
        ]
        
        if filtered_data.empty:
            raise HTTPException(status_code=404, detail="No matching data found.")
        
        # Find the room number for the given student ID
        room_number = filtered_data['Room'].apply(lambda room: parse_room_info(room, request.student_id)).dropna()
        
        if room_number.empty:
            raise HTTPException(status_code=404, detail="No room found for the given student ID.")

         # Create a JSON response object with exam details
        response = filtered_data[['Exam Date', 'Exam Time']].copy()
        response['Room'] = room_number.iloc[0]  # Add the matching room to the response
        
        # Convert to a list of dictionaries for JSON compatibility
        result = response.to_dict(orient='records')
        
        return {"success": True, "routine": result}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))