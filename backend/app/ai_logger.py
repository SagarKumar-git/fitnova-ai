import os
import json
from datetime import datetime
import threading
from typing import Dict, Any, List

# Define the local log path inside the backend directory to avoid database schema updates
LOG_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ai_analytics.jsonl")

# Cost multipliers for gemini-2.5-flash
# Input: $0.075 / 1M tokens ($0.000075 per 1K tokens)
# Output: $0.30 / 1M tokens ($0.00030 per 1K tokens)
INPUT_TOKEN_RATE = 0.075 / 1000000
OUTPUT_TOKEN_RATE = 0.30 / 1000000

# Concurrency lock for writing to file
log_lock = threading.Lock()

def log_ai_usage(
    user_id: str,
    user_name: str,
    feature: str,  # 'workout', 'meal', 'insights'
    prompt: str,
    response: str,
    success: bool,
    model: str = "gemini-2.5-flash",
    input_tokens: int = 0,
    output_tokens: int = 0
):
    """
    Logs an AI request/response transaction, calculates token costs, and appends to the JSONL file.
    """
    # Calculate estimated cost
    cost = (input_tokens * INPUT_TOKEN_RATE) + (output_tokens * OUTPUT_TOKEN_RATE)
    
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": str(user_id),
        "user_name": user_name,
        "feature": feature,
        "prompt": prompt,
        "response": response,
        "success": success,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "estimated_cost_usd": round(cost, 6)
    }
    
    with log_lock:
        try:
            with open(LOG_FILE_PATH, "a", encoding="utf-8") as f:
                f.write(json.dumps(log_entry) + "\n")
        except Exception as e:
            print(f"Failed to write AI usage log: {e}")

def get_ai_analytics_summary() -> Dict[str, Any]:
    """
    Reads the JSONL file and computes aggregated statistics for the Admin Dashboard.
    """
    total_requests = 0
    total_success = 0
    total_workouts = 0
    total_meals = 0
    total_insights = 0
    total_cost = 0.0
    total_input_tokens = 0
    total_output_tokens = 0
    
    daily_activity = {}  # date_str -> count
    user_breakdown = {}  # user_id -> {name, count, cost}
    recent_logs = []
    
    if os.path.exists(LOG_FILE_PATH):
        with log_lock:
            try:
                with open(LOG_FILE_PATH, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                    
                for line in lines:
                    if not line.strip():
                        continue
                    try:
                        entry = json.loads(line)
                        total_requests += 1
                        
                        if entry.get("success", False):
                            total_success += 1
                            
                        feat = entry.get("feature")
                        if feat == "workout":
                            total_workouts += 1
                        elif feat == "meal":
                            total_meals += 1
                        elif feat == "insights":
                            total_insights += 1
                            
                        cost = entry.get("estimated_cost_usd", 0.0)
                        total_cost += cost
                        
                        total_input_tokens += entry.get("input_tokens", 0)
                        total_output_tokens += entry.get("output_tokens", 0)
                        
                        # Daily breakdown
                        ts_str = entry.get("timestamp", "")
                        if ts_str:
                            date_str = ts_str.split("T")[0]
                            daily_activity[date_str] = daily_activity.get(date_str, 0) + 1
                            
                        # User breakdown
                        u_id = entry.get("user_id")
                        if u_id:
                            if u_id not in user_breakdown:
                                user_breakdown[u_id] = {
                                    "name": entry.get("user_name", "Unknown"),
                                    "count": 0,
                                    "cost": 0.0
                                }
                            user_breakdown[u_id]["count"] += 1
                            user_breakdown[u_id]["cost"] = round(user_breakdown[u_id]["cost"] + cost, 6)
                            
                        # Keep recent logs
                        recent_logs.append({
                            "timestamp": entry.get("timestamp"),
                            "user_name": entry.get("user_name"),
                            "feature": entry.get("feature"),
                            "success": entry.get("success"),
                            "model": entry.get("model"),
                            "cost": cost
                        })
                    except Exception as parse_err:
                        print(f"Error parsing log line: {parse_err}")
            except Exception as read_err:
                print(f"Error reading log file: {read_err}")
                
    # Sort and slice recent logs (limit to 50)
    recent_logs = sorted(recent_logs, key=lambda x: x["timestamp"], reverse=True)[:50]
    
    # Format user list
    user_list = [
        {"user_id": uid, "name": val["name"], "count": val["count"], "cost": round(val["cost"], 5)}
        for uid, val in user_breakdown.items()
    ]
    user_list = sorted(user_list, key=lambda x: x["count"], reverse=True)
    
    # Format daily activity
    daily_list = [
        {"date": d, "count": cnt}
        for d, cnt in sorted(daily_activity.items())
    ]
    
    success_rate = round((total_success / total_requests) * 100, 1) if total_requests > 0 else 100.0
    
    return {
        "total_requests": total_requests,
        "success_rate": success_rate,
        "total_workouts": total_workouts,
        "total_meals": total_meals,
        "total_insights": total_insights,
        "total_cost_usd": round(total_cost, 4),
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "daily_activity": daily_list,
        "users": user_list,
        "recent_logs": recent_logs
    }
