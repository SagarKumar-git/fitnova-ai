from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import uuid
from datetime import datetime, date, timedelta

from app.database import get_db
from app.models import User, FoodLog, MealPlan, Exercise, WorkoutSession, AIWorkoutPlan, AIMealPlan, UserAchievement, WorkoutStreak, Achievement, WaterLog, DailyNutritionSummary, WeightHistory, FitnessMetrics, AIInsight
from app.schemas import AIInsightResponse
from app.auth import get_current_user
from app.calculations import calculate_protein_target, calculate_water_target

router = APIRouter(prefix="/ai", tags=["AI Insights"])

@router.get("/insights", response_model=List[AIInsightResponse])
def get_user_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        profile = current_user.profile
        if not profile:
            return []

        today = date.today()
        start_date = today - timedelta(days=6)
        new_insights = []

        # ==========================================
        # 1. HYDRATION INSIGHT
        # ==========================================
        water_target_ml = calculate_water_target(profile.weight, profile.activity_level) * 1000.0
        
        # Query total water logged per day for the last 7 days
        water_logs = db.query(
            WaterLog.logged_date,
            func.sum(WaterLog.amount_ml).label("daily_total")
        ).filter(
            WaterLog.user_id == current_user.id,
            WaterLog.logged_date >= start_date,
            WaterLog.logged_date <= today
        ).group_by(
            WaterLog.logged_date
        ).all()
        
        water_by_date = {log.logged_date: log.daily_total for log in water_logs}
        
        days_below_water = 0
        for i in range(7):
            check_day = start_date + timedelta(days=i)
            daily_intake = water_by_date.get(check_day, 0)
            if daily_intake < water_target_ml:
                days_below_water += 1

        if days_below_water > 0:
            new_insights.append(AIInsight(
                user_id=current_user.id,
                type="hydration",
                title="Hydration Alert",
                message=f"Your hydration has been below target for {days_below_water} days in the last week. Drink at least {round(water_target_ml / 1000.0, 1)}L daily.",
                status="warning",
                priority="high" if days_below_water >= 4 else "medium"
            ))
        else:
            new_insights.append(AIInsight(
                user_id=current_user.id,
                type="hydration",
                title="Hydration Master",
                message="Outstanding! You reached your daily hydration target on all of the last 7 days. Keep it up!",
                status="success",
                priority="low"
            ))

        # ==========================================
        # 2. PROTEIN INSIGHT
        # ==========================================
        protein_target = calculate_protein_target(profile.weight, profile.goal)
        
        # Query protein logged per day in the last 7 days from DailyNutritionSummary
        nutrition_summaries = db.query(
            DailyNutritionSummary.date,
            DailyNutritionSummary.total_protein
        ).filter(
            DailyNutritionSummary.user_id == current_user.id,
            DailyNutritionSummary.date >= start_date,
            DailyNutritionSummary.date <= today
        ).all()
        
        protein_by_date = {summary.date: summary.total_protein for summary in nutrition_summaries}
        
        days_met_protein = 0
        for i in range(7):
            check_day = start_date + timedelta(days=i)
            daily_protein = protein_by_date.get(check_day, 0.0)
            if daily_protein >= protein_target:
                days_met_protein += 1

        if days_met_protein >= 5:
            new_insights.append(AIInsight(
                user_id=current_user.id,
                type="protein",
                title="Protein Intake Confirmed",
                message=f"Excellent! You reached your protein goal on {days_met_protein} of the last 7 days. Your daily target is {round(protein_target, 1)}g.",
                status="success",
                priority="low"
            ))
        elif days_met_protein >= 3:
            new_insights.append(AIInsight(
                user_id=current_user.id,
                type="protein",
                title="Protein Intake On Track",
                message=f"You reached your protein goal on {days_met_protein} of the last 7 days. Focus on high-protein sources to consistently hit your {round(protein_target, 1)}g target.",
                status="info",
                priority="medium"
            ))
        else:
            new_insights.append(AIInsight(
                user_id=current_user.id,
                type="protein",
                title="Protein Target Alert",
                message=f"Your protein intake was below target on {7 - days_met_protein} days this week. Aim to consume {round(protein_target, 1)}g daily to support recovery.",
                status="warning",
                priority="high"
            ))

        # ==========================================
        # 3. WORKOUT CONSISTENCY INSIGHT
        # ==========================================
        streak = db.query(WorkoutStreak).filter(WorkoutStreak.user_id == current_user.id).first()
        daily_streak = streak.daily_streak if streak else 0
        
        completed_in_30_days = db.query(WorkoutSession).filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.started_at >= datetime.combine(today - timedelta(days=29), datetime.min.time())
        ).count()
        
        consistency_score = min(100, round((completed_in_30_days / 12.0) * 100))
        
        if daily_streak >= 3:
            new_insights.append(AIInsight(
                user_id=current_user.id,
                type="workout",
                title="Workout Streak Active",
                message=f"You are on a hot {daily_streak}-day workout streak! Consistency score is {consistency_score}% for the last 30 days. Recovery tip: prioritize stretching and sleep.",
                status="success",
                priority="medium"
            ))
        elif daily_streak > 0:
            new_insights.append(AIInsight(
                user_id=current_user.id,
                type="workout",
                title="Consistency Building",
                message=f"Keep it rolling! You're on a {daily_streak}-day streak. Your 30-day consistency score is {consistency_score}%. Plan your next session to keep the habit active.",
                status="info",
                priority="low"
            ))
        else:
            new_insights.append(AIInsight(
                user_id=current_user.id,
                type="workout",
                title="Resume Workout Streak",
                message=f"No active workout streak. Consistency score: {consistency_score}%. Aim to log a workout template this week to re-establish your fitness momentum.",
                status="info",
                priority="medium"
            ))

        # ==========================================
        # 4. WEIGHT PREDICTION INSIGHT
        # ==========================================
        weights = db.query(WeightHistory.weight, WeightHistory.recorded_at).filter(
            WeightHistory.user_id == current_user.id
        ).order_by(WeightHistory.recorded_at.asc()).all()
        
        metrics = db.query(FitnessMetrics).filter(
            FitnessMetrics.user_id == current_user.id
        ).order_by(FitnessMetrics.created_at.desc()).first()
        
        target_weight = metrics.target_weight if metrics else (profile.weight - 5.0 if profile.goal == "Fat Loss" else profile.weight + 5.0 if profile.goal == "Muscle Gain" else profile.weight)
        current_weight = weights[-1].weight if weights else profile.weight
        
        if len(weights) >= 2:
            days_diff = (weights[-1].recorded_at - weights[0].recorded_at).days
            if days_diff > 0:
                weekly_progress = ((weights[-1].weight - weights[0].weight) / days_diff) * 7
            else:
                weekly_progress = -0.5 if profile.goal == "Fat Loss" else 0.25 if profile.goal == "Muscle Gain" else 0.0
        else:
            weekly_progress = -0.5 if profile.goal == "Fat Loss" else 0.25 if profile.goal == "Muscle Gain" else 0.0

        expected_weight_30d = current_weight + (weekly_progress / 7.0) * 30
        
        if (profile.goal == "Fat Loss" and weekly_progress < 0) or (profile.goal == "Muscle Gain" and weekly_progress > 0):
            days_to_target = (target_weight - current_weight) / (weekly_progress / 7.0)
            if 0 < days_to_target < 365:
                target_date = today + timedelta(days=int(days_to_target))
            else:
                target_date = today + timedelta(days=90)
        else:
            target_date = today + timedelta(days=90)

        is_progressing = (profile.goal == "Fat Loss" and weekly_progress < 0) or (profile.goal == "Muscle Gain" and weekly_progress > 0) or (profile.goal == "Maintenance" and abs(weekly_progress) < 0.2)
        
        new_insights.append(AIInsight(
            user_id=current_user.id,
            type="weight",
            title="Weight Prediction & Target Timeline",
            message=f"At your current rate of {round(abs(weekly_progress), 2)} kg/week, you will reach your target weight of {round(target_weight, 1)} kg around {target_date.strftime('%B %d, %Y')}. Expected weight in 30 days: {round(expected_weight_30d, 1)} kg.",
            status="success" if is_progressing else "info",
            priority="medium"
        ))

        # ==========================================
        # 5. AI COACH USAGE
        # ==========================================
        ai_workouts_count = db.query(AIWorkoutPlan).filter(AIWorkoutPlan.user_id == current_user.id).count()
        ai_meals_count = db.query(AIMealPlan).filter(AIMealPlan.user_id == current_user.id).count()
        
        if ai_workouts_count == 0 or ai_meals_count == 0:
            new_insights.append(AIInsight(
                user_id=current_user.id,
                type="prediction",
                title="Unlock AI Coaching",
                message="Maximize your results by generating custom workout and meal schedules in the AI Coach tab.",
                status="info",
                priority="medium"
            ))
        else:
            new_insights.append(AIInsight(
                user_id=current_user.id,
                type="prediction",
                title="AI Coach Recommendations",
                message=f"You have generated {ai_workouts_count} AI workouts and {ai_meals_count} meals. Refresh your plans weekly to align with biometric adaptations.",
                status="success",
                priority="low"
            ))

        # ==========================================
        # 6. ACHIEVEMENT PROGRESS
        # ==========================================
        near_achievement = db.query(
            UserAchievement, Achievement
        ).join(
            Achievement, UserAchievement.achievement_id == Achievement.id
        ).filter(
            UserAchievement.user_id == current_user.id,
            UserAchievement.is_unlocked == False,
            UserAchievement.current_progress > 0
        ).order_by(
            (Achievement.max_progress - UserAchievement.current_progress).asc()
        ).first()

        if near_achievement:
            user_ach, ach = near_achievement
            remaining = ach.max_progress - user_ach.current_progress
            unit = "workout" if "workout" in ach.key or "beast" in ach.key else "day"
            suffix = f"{unit}{'s' if remaining > 1 else ''}"
            new_insights.append(AIInsight(
                user_id=current_user.id,
                type="achievement",
                title="Badge Unlock Close!",
                message=f"You are only {remaining} {suffix} away from unlocking '{ach.title}'. {ach.description}",
                status="info",
                priority="medium"
            ))
        else:
            new_insights.append(AIInsight(
                user_id=current_user.id,
                type="achievement",
                title="Achievements Goal",
                message="Keep tracking meals, water, and exercise sessions to unlock badges and build new healthy habits.",
                status="info",
                priority="low"
            ))

        # Overwrite outdated insights: Delete old and save new
        db.query(AIInsight).filter(AIInsight.user_id == current_user.id).delete()
        db.add_all(new_insights)
        db.commit()

        # Re-query saved insights to return clean responses
        saved_insights = db.query(AIInsight).filter(
            AIInsight.user_id == current_user.id
        ).order_by(AIInsight.created_at.desc()).all()

        return saved_insights
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compile AI insights: {str(e)}"
        )
