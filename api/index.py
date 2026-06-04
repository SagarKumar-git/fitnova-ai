from backend.app.main import app

@app.get("/")
def root():
    return {"message": "FitNova API Running"}