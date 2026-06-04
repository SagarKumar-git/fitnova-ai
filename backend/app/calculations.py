def calculate_bmr(weight: float, height: float, age: int, gender: str) -> float:
    """
    Calculates Basal Metabolic Rate (BMR) using the Mifflin-St Jeor Equation.
    - Male: BMR = 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) + 5
    - Female: BMR = 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) - 161
    - Other: BMR = 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) - 78 (average)
    """
    g = gender.lower()
    if g == "male":
        return 10.0 * weight + 6.25 * height - 5.0 * age + 5.0
    elif g == "female":
        return 10.0 * weight + 6.25 * height - 5.0 * age - 161.0
    else:
        return 10.0 * weight + 6.25 * height - 5.0 * age - 78.0


def calculate_tdee(bmr: float, activity_level: str) -> float:
    """
    Calculates Total Daily Energy Expenditure (TDEE) based on activity level.
    """
    multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very active": 1.9
    }
    multiplier = multipliers.get(activity_level.lower(), 1.2)
    return bmr * multiplier


def calculate_calorie_target(tdee: float, goal: str) -> float:
    """
    Calculates daily calorie intake targets based on the user's fitness goal.
    - Muscle Gain (Surplus): TDEE + 300 kcal
    - Fat Loss (Deficit): TDEE - 500 kcal (safety floor at 1200 kcal)
    - Maintenance: TDEE
    """
    g = goal.lower()
    if "gain" in g:
        return tdee + 300.0
    elif "loss" in g:
        target = tdee - 500.0
        return max(target, 1200.0)  # Safe minimum floor for daily calories
    else:
        return tdee


def calculate_protein_target(weight: float, goal: str) -> float:
    """
    Calculates daily protein target (in grams) based on weight and goal.
    - Muscle Gain: 2.2g per kg of body weight
    - Fat Loss: 2.0g per kg of body weight
    - Maintenance: 1.8g per kg of body weight
    """
    g = goal.lower()
    if "gain" in g:
        return 2.2 * weight
    elif "loss" in g:
        return 2.0 * weight
    else:
        return 1.8 * weight


def calculate_water_target(weight: float, activity_level: str) -> float:
    """
    Calculates daily water intake (in liters) based on body weight and activity.
    - Sedentary/Light: weight * 0.033 L
    - Moderate/Active: weight * 0.035 + 0.5 L
    - Very Active: weight * 0.040 + 0.75 L
    """
    act = activity_level.lower()
    if act in ["sedentary", "light"]:
        return weight * 0.033
    elif act in ["moderate", "active"]:
        return (weight * 0.035) + 0.5
    elif act in ["very active"]:
        return (weight * 0.040) + 0.75
    else:
        return weight * 0.033
