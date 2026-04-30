import { Plan, Day } from '../store';

const generateDays = (totalDays: number): Day[] => {
  const days: Day[] = [];
  const today = new Date();
  
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (totalDays - 1 - i));
    
    let status: Day['status'];
    if (i < 10) status = 'completed';
    else if (i === 10) status = 'current';
    else if (i === totalDays - 1) status = 'rest';
    else status = 'locked';
    
    const sets = status === 'rest' ? undefined : 
      i < 3 ? [10, 12, 7] :
      i < 6 ? [12, 10, 8] :
      i < 10 ? [15, 12, 10] : [8, 8, 8];
    
    days.push({
      day: i + 1,
      date: date.toISOString().split('T')[0],
      status,
      sets,
    });
  }
  
  return days;
};

export const mockPlan: Plan = {
  id: 'plan-1',
  name: 'ROAD TO 100 PUSHUPS',
  level: 'intermediate',
  goal: 'road_100',
  trainingDays: ['mon', 'wed', 'fri'],
  preferredTime: '07:30',
  notificationIds: [],
  currentDayIndex: 10,
  duration: '4 WEEKS',
  totalDays: 17,
  completedDays: 13,
  days: generateDays(17),
};

export const mockPlans = [mockPlan];
