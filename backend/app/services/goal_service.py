"""
Goal Service — Strategic OKR Alignment & Progress Tracking
"""
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.database.models import Goal, GoalAction, ActionItem

class GoalService:
    @staticmethod
    def calculate_progress(db: Session, goal_id: str) -> float:
        links = db.query(GoalAction).filter(GoalAction.goal_id == goal_id).all()
        if not links:
            return 0.0
        
        completed = 0
        total = len(links)
        for link in links:
            act = db.query(ActionItem).filter(ActionItem.id == link.action_id).first()
            if act and act.status == "COMPLETED":
                completed += 1
                
        progress = round((completed / total) * 100, 1)
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if goal:
            goal.progress_pct = progress
            if progress >= 100:
                goal.status = "COMPLETED"
        return progress

    @staticmethod
    def link_action_to_goal(
        db: Session,
        goal_id: str,
        action_id: str,
        ai_suggested: bool = False
    ) -> GoalAction:
        link = GoalAction(
            id=str(uuid.uuid4()),
            goal_id=goal_id,
            action_id=action_id,
            ai_suggested=ai_suggested,
            status="CONFIRMED" if not ai_suggested else "SUGGESTED"
        )
        db.add(link)
        return link

goal_service = GoalService()
